export const metadata = { title: 'Plan — SurveyDash Studio', alternates: { canonical: '/pricing' } };
import Link from 'next/link';
import { Check } from 'lucide-react';
import { PublicFrame } from '@/components/public-frame';
export default function PricingPage() {
  return (
    <PublicFrame>
      <article className="public-article">
        <span className="eyebrow">PLAN</span>
        <h1>Mulai gratis. Kenali alurnya.</h1>
        <p>
          SurveyDash Studio tersedia untuk pengujian workspace pribadi. Harga paket berbayar belum ditetapkan
          dan pembayaran belum diaktifkan.
        </p>
        <section className="card pricing-card">
          <h2>Free Plan</h2>
          <strong className="pricing-price">
            Rp0<span> selama pengujian</span>
          </strong>
          <ul>
            {[
              'Form dan pengumpulan jawaban',
              'Tabel data dan ekspor CSV',
              'Analisis survei dan SKM / IKM',
              'Template form dan presentasi',
              'Editor presentasi dan pratinjau',
            ].map((feature) => (
              <li key={feature}>
                <Check size={17} />
                {feature}
              </li>
            ))}
          </ul>
          <Link href="/login?mode=signup" className="btn btn-primary">
            Mulai gratis
          </Link>
        </section>
        <section>
          <h2>Paket berbayar</h2>
          <p>
            Checkout, langganan, dan invoice belum tersedia. Tidak ada transaksi atau biaya yang diproses oleh
            halaman ini.
          </p>
        </section>
        <section>
          <h2>Data Anda tetap tersedia</h2>
          <p>
            Arsip dan sampah dapat dipulihkan. Batas pemakaian yang aktif, jika diberlakukan pengelola,
            ditampilkan pada halaman plan workspace dan tidak menghapus data historis.
          </p>
        </section>
      </article>
    </PublicFrame>
  );
}
