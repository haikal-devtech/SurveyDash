import { PassThrough, Readable } from 'node:stream';
import { setImmediate } from 'node:timers/promises';
import type { Worksheet } from 'exceljs';
import { getSurvey, AppError } from './repository';
import { answerLabel } from './model';
import { countResponseExport, responseExportRows, responseQuerySchema } from './responses-repository';

function header(sheet: Worksheet, labels: string[]) {
  sheet.columns = labels.map((label, index) => ({ header: label, width: index === 0 ? 38 : 26 }));
  const row = sheet.getRow(1);
  row.height = 34;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6745C6' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  row.commit();
}

export async function exportResponseXlsx(id: string, ownerId: string, input: unknown, signal: AbortSignal) {
  const query = responseQuerySchema.parse(input);
  const survey = await getSurvey(id, ownerId);
  const count = await countResponseExport(id, ownerId, query);
  if (count > 1_048_575)
    throw new AppError('Data melebihi batas baris Excel. Gunakan pencarian untuk memperkecil unduhan.', 413);
  const ExcelJS = (await import('exceljs')).default;
  const output = new PassThrough({ highWaterMark: 64 * 1024 });
  const body = Readable.toWeb(output) as ReadableStream<Uint8Array>;
  const controller = new AbortController();
  const cancel = () => {
    controller.abort();
    output.destroy(new Error('Unduhan dibatalkan.'));
  };
  const aborted = AbortSignal.any([signal, controller.signal]);
  signal.addEventListener('abort', cancel, { once: true });
  output.once('close', () => {
    controller.abort();
    signal.removeEventListener('abort', cancel);
  });
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: output,
    useStyles: true,
    useSharedStrings: false,
  });
  const sheet = workbook.addWorksheet('Jawaban', { views: [{ state: 'frozen', ySplit: 1 }] });
  const labels = [
    'ID respons',
    'Waktu (WIB)',
    'Surveyor',
    'Username surveyor',
    'ID penugasan',
    ...survey.questions.map((q) => q.label),
    'Sumber impor',
    'ID respons sumber',
    'Bobot manual (revisi terbaru)',
  ];
  header(sheet, labels);
  sheet.getColumn(2).numFmt = 'yyyy-mm-dd hh:mm:ss';
  const info = workbook.addWorksheet('Informasi', { views: [{ state: 'frozen', ySplit: 1 }] });
  header(info, ['Keterangan', 'Nilai']);
  info.addRow(['Survei', survey.title]).commit();
  info.addRow(['Filter pencarian', query.search || 'Semua jawaban']).commit();
  info
    .addRow([
      'Dataset',
      (query.dataset ?? survey.dataset) === 'accepted'
        ? 'Hanya respons diterima pada revisi terbaru'
        : 'Semua respons mentah',
    ])
    .commit();
  info
    .addRow([
      'Filter wilayah / surveyor / tanggal',
      JSON.stringify({
        province: query.province,
        surveyor: query.surveyor,
        after: query.after,
        before: query.before,
      }),
    ])
    .commit();
  info
    .addRow(['Waktu', 'Kolom waktu memakai WIB (UTC+7). Data asli impor mempertahankan waktu sumber.'])
    .commit();
  info
    .addRow([
      'Data asli impor',
      'Lembar Data asli menyimpan resource respons Google dalam JSON, termasuk jawaban yang belum masuk grafik. Gabungkan bagian sesuai ID dan urutannya untuk JSON lengkap.',
    ])
    .commit();
  info
    .addRow([
      'Teks',
      'Nomor rekening dan jawaban teks disimpan sebagai teks. Teks yang diawali tanda = tetap berupa teks.',
    ])
    .commit();
  info.commit();
  async function write() {
    let rawSheet: Worksheet | undefined;
    let rawRows = 0;
    let rawPage = 0;
    let rowCount = 1;
    for await (const response of responseExportRows(id, ownerId, query, aborted)) {
      if (++rowCount > 1_048_576) throw new Error('Batas baris Excel terlampaui.');
      const values = survey.questions.map((q) => {
        const answer = response.answers[q.id];
        return q.type === 'number' && typeof answer === 'number' ? answer : answerLabel(q, answer);
      });
      // Excel has no timezone; write the WIB wall clock as an explicit UTC+7 serial.
      sheet
        .addRow([
          response.id,
          new Date(Date.parse(response.submittedAt) + 7 * 3600_000),
          response.surveyor?.fullName ?? '',
          response.surveyor?.username ?? '',
          response.surveyor?.assignmentId ?? '',
          ...values,
          response.importProvider,
          response.importResponseId,
          response.analysisWeight,
        ])
        .commit();
      if (response.importRaw) {
        const chunks = response.importRaw.match(/[\s\S]{1,15000}/gu) ?? [];
        for (const [index, chunk] of chunks.entries()) {
          if (!rawSheet || rawRows >= 1_048_575) {
            rawSheet?.commit();
            rawSheet = workbook.addWorksheet('Data asli ' + ++rawPage, {
              views: [{ state: 'frozen', ySplit: 1 }],
            });
            header(rawSheet, [
              'ID respons',
              'ID respons sumber',
              'Bagian JSON',
              'Jumlah bagian',
              'Data asli (JSON)',
            ]);
            rawSheet.getColumn(5).width = 80;
            rawRows = 0;
          }
          rawSheet.addRow([response.id, response.importResponseId, index + 1, chunks.length, chunk]).commit();
          rawRows++;
        }
      }
      if (rowCount % 100 === 0) await setImmediate();
    }
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rowCount, column: labels.length } };
    sheet.commit();
    rawSheet?.commit();
    await workbook.commit();
  }
  void write().catch((error) => {
    output.destroy(error instanceof Error ? error : new Error('Excel gagal dibuat.'));
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="' + (survey.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'survei') + '.xlsx"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
