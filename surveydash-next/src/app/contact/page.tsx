export const metadata = { title: 'Kontak — SurveyDash Studio', alternates: { canonical: '/contact' } };
import Link from 'next/link';
import { PublicFrame } from '@/components/public-frame';
export default function ContactPage() {
  return (
    <PublicFrame>
      <article className="public-article">
        <h1>Bantuan dan kontak.</h1>
        <p>
          Mulai dari{' '}
          <Link className="text-link" href="/help">
            panduan penggunaan
          </Link>{' '}
          untuk alur form, data, template, dan presentasi.
        </p>
        <section>
          <h2>Laporan masalah teknis</h2>
          <p>
            Bug tanpa data pribadi dapat dilaporkan melalui repository proyek. Hindari menyertakan kata sandi,
            jawaban responden, token sesi, atau kredensial database.
          </p>
          <a
            className="btn btn-secondary"
            href="https://github.com/haikal-devtech/SurveyDash/issues"
            target="_blank"
            rel="noreferrer"
          >
            Buka isu GitHub
          </a>
        </section>
        <section>
          <h2>Permintaan privasi</h2>
          <p>
            {process.env.SUPPORT_EMAIL
              ? 'Hubungi pengelola melalui email berikut untuk permintaan terkait data.'
              : 'Alamat kontak khusus pengelola belum dipublikasikan. Jangan menaruh permintaan yang berisi data pribadi pada isu GitHub publik.'}
          </p>
          {process.env.SUPPORT_EMAIL && (
            <a className="text-link" href={`mailto:${process.env.SUPPORT_EMAIL}`}>
              {process.env.SUPPORT_EMAIL}
            </a>
          )}
        </section>
      </article>
    </PublicFrame>
  );
}
