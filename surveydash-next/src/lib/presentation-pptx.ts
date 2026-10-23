import type PptxGenJS from 'pptxgenjs';
import type { PresentationDocument } from './presentation-model';
import { chartColors } from './chart-types';
import { chartSeries } from './analytics-model';
/** Native Office objects: exports stay editable; font metrics may differ in Office. */
export async function editablePresentation(
  document: PresentationDocument,
  image: (assetId: string) => Promise<string>,
) {
  const { default: Pptx } = await import('pptxgenjs');
  const pptx = new Pptx();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = document.title;
  pptx.author = 'SurveyDash Studio';
  pptx.subject = document.demo ? 'Data simulasi' : 'Hasil survei';
  for (const source of document.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: source.background.slice(1) };
    slide.addNotes(
      `SurveyDash Studio · dokumen v${document.version} · ${document.demo ? 'Data simulasi' : 'Hasil survei'} · ${document.sourceRevision}`,
    );
    for (const element of source.elements) {
      const position = {
        x: element.x / 96,
        y: element.y / 96,
        w: element.w / 96,
        h: element.h / 96,
        rotate: (element.rotation + 360) % 360,
      };
      const transparency = Math.round((1 - element.opacity) * 100);
      if (element.type === 'text')
        slide.addText(element.text, {
          ...position,
          fontFace: 'Inter',
          fontSize: element.fontSize * 0.75,
          bold: element.fontWeight >= 600,
          color: element.color.slice(1),
          align: element.align,
          valign: 'top',
          margin: 0,
          breakLine: false,
          fit: 'shrink',
          transparency,
          lineSpacingMultiple: element.lineHeight,
        });
      else if (element.type === 'shape')
        slide.addShape(
          element.shape === 'circle'
            ? pptx.ShapeType.ellipse
            : element.shape === 'rounded'
              ? pptx.ShapeType.roundRect
              : element.shape === 'line'
                ? pptx.ShapeType.line
                : pptx.ShapeType.rect,
          {
            ...position,
            fill: { color: element.fill.slice(1), transparency },
            line: {
              color: element.stroke.slice(1),
              width: element.strokeWidth * 0.75,
              transparency: element.strokeWidth ? transparency : 100,
            },
          },
        );
      else if (element.type === 'image' && element.assetId) {
        const data = await image(element.assetId);
        slide.addImage({
          data,
          ...position,
          sizing: { type: element.fit, w: position.w, h: position.h },
          transparency,
        });
      } else if (element.type === 'chart') {
        const { rows } = chartSeries(element.data ?? []);
        if (!rows.length) {
          slide.addText('Belum ada data', { ...position, fontSize: 16, color: element.color.slice(1) });
          continue;
        }
        const kind = element.binding?.chartType ?? 'bar';
        if (kind === 'table') {
          const total = rows.reduce((sum, row) => sum + row.count, 0);
          slide.addTable(
            [
              ['Kategori', 'Jumlah', '%'],
              ...rows.map((row) => [
                row.name,
                String(row.count),
                total ? ((row.count / total) * 100).toFixed(1) + '%' : '0%',
              ]),
            ].map((row) => row.map((text) => ({ text }))),
            {
              ...position,
              fontSize: 11,
              border: { type: 'solid', color: 'E8E5EE', pt: 0.5 },
              color: element.color.slice(1),
              fill: { color: source.background.slice(1) },
              autoPage: false,
              margin: 4,
            },
          );
          continue;
        }
        const type =
          kind === 'donut'
            ? pptx.ChartType.doughnut
            : kind === 'pie'
              ? pptx.ChartType.pie
              : kind === 'line'
                ? pptx.ChartType.line
                : kind === 'area'
                  ? pptx.ChartType.area
                  : pptx.ChartType.bar;
        const series =
          kind === 'stacked'
            ? rows.map((row) => ({ name: row.name, labels: ['Semua pilihan'], values: [row.count] }))
            : [
                {
                  name: 'Respons',
                  labels: rows.map((row) => row.name),
                  values: rows.map((row) => row.count),
                },
              ];
        const options: PptxGenJS.IChartOpts = {
          ...position,
          chartColors: chartColors.map((color) => color.slice(1)),
          showLegend: ['pie', 'donut', 'stacked'].includes(kind),
          showTitle: false,
          showValue: true,
          showPercent: ['pie', 'donut'].includes(kind),
          catAxisLabelFontFace: 'Inter',
          catAxisLabelFontSize: 10,
          valAxisLabelFontSize: 10,
        };
        if (['bar', 'lollipop', 'stacked', 'column'].includes(kind)) {
          options.barDir = kind === 'column' ? 'col' : 'bar';
          options.barGrouping = kind === 'stacked' ? 'percentStacked' : 'clustered';
        }
        slide.addChart(type, series, options);
      }
    }
  }
  return pptx;
}
