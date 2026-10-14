export const metadata = { title: 'Kontak — SurveyDash Studio', alternates: { canonical: '/contact' } };
import Link from 'next/link';
import { PublicFrame } from '@/components/public-frame';
import { SUPPORT_EMAIL } from '@/lib/support';
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
            Hubungi pengelola melalui email berikut untuk bantuan dan permintaan terkait data. Jangan sertakan
            kata sandi atau token sesi.
          </p>
          <a className="text-link" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </section>
      </article>
    </PublicFrame>
  );
}
