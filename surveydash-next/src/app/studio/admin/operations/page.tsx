import { requireAdmin } from '@/lib/http';
import { operationReadiness } from '@/lib/operations';
import Link from 'next/link';
import { listDataRequests } from '@/lib/data-governance';
import { DataRequestAdmin } from '@/components/data-request-panel';
export default async function OperationsPage() {
  await requireAdmin();
  const data = await operationReadiness();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Operasional sistem</h1>
          <p>Kesiapan konfigurasi dan kejadian error terbaru. Nilai rahasia tidak ditampilkan.</p>
        </div>
        <Link href="/studio/admin">Kembali ke admin</Link>
      </div>
      <section className="card" style={{ padding: 24 }}>
        <h2>Layanan</h2>
        <p>
          Database: terhubung · Pemulihan password: {data.passwordRecovery ? 'aktif' : 'belum aktif'} ·
          Verifikasi email: {data.emailVerification ? 'aktif' : 'belum aktif'}
        </p>
        <p className="hint">
          Konfigurasi lengkap belum membuktikan email diterima. Jalankan verifikasi SMTP dan pengujian kotak
          masuk sebelum menyatakan layanan siap.
        </p>
        <dl>
          {Object.entries(data.configuration).map(([key, present]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{present ? 'Tersedia' : 'Belum diatur'}</dd>
            </div>
          ))}
        </dl>
      </section>
      <DataRequestAdmin initial={await listDataRequests()} />
      <section className="card" style={{ padding: 24, marginTop: 20 }}>
        <h2>Error terbaru</h2>
        <p className="hint">
          Catatan ini hanya memuat rute, jenis error, kode dan ID kejadian. Disimpan 14 hari; detail lebih
          lanjut tersedia di log penyedia.
        </p>
        {data.events.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Rute</th>
                  <th>Jenis</th>
                  <th>ID laporan</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event) => (
                  <tr key={String(event.id)}>
                    <td>{String(event.at)}</td>
                    <td>{String(event.route)}</td>
                    <td>
                      {String(event.error_name)} {String(event.code)}
                    </td>
                    <td>{String(event.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Belum ada error yang tercatat oleh sistem ini.</p>
        )}
      </section>
    </>
  );
}
