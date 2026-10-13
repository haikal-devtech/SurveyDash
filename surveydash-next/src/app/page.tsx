import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, FileText, Table2, BarChart3, Presentation, Check } from 'lucide-react';
import { PublicFrame } from '@/components/public-frame';
const steps = [
  { title: 'Form', text: 'Susun pertanyaan dan bagikan link kepada responden.', icon: FileText },
  { title: 'Data', text: 'Kelola jawaban dalam tabel yang mudah dibaca.', icon: Table2 },
  { title: 'Insight', text: 'Pahami distribusi jawaban dan nilai IKM untuk SKM.', icon: BarChart3 },
  {
    title: 'Presentasi',
    text: 'Susun hasil menjadi grafik dan slide yang siap dibagikan.',
    icon: Presentation,
  },
];
export default function Page() {
  return (
    <PublicFrame>
      <section className="marketing-hero">
        <span className="eyebrow">FORM · DATA · INSIGHT</span>
        <h1>
          Buat survei dengan mudah.
          <br />
          <span>Pahami setiap jawaban.</span>
        </h1>
        <p>Dari pertanyaan pertama hingga analisis hasil, semua dalam satu ruang kerja.</p>
        <div className="actions">
          <Link href="/login?mode=signup" className="btn btn-primary">
            Mulai gratis
            <ArrowRight size={16} />
          </Link>
          <Link href="#cara-kerja" className="btn btn-secondary">
            Lihat cara kerja
          </Link>
        </div>
        <small>Workspace pribadi · Tanpa kartu kredit</small>
        <div className="product-preview">
          <Image
            src="/product-workspace.png"
            alt="Beranda SurveyDash Studio dengan pilihan template dan tabel survei"
            width="1440"
            height="900"
            priority
            sizes="(max-width: 1250px) 100vw, 1250px"
          />
          <p>Pratinjau produk memakai workspace pengujian dan data simulasi.</p>
        </div>
      </section>
      <section id="cara-kerja" className="marketing-section">
        <span className="eyebrow">SATU ALUR KERJA</span>
        <h2>
          Mulai dari pertanyaan.
          <br />
          Sampai hasil yang bisa diceritakan.
        </h2>
        <div className="workflow-steps">
          {steps.map((step, index) => (
            <article key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <step.icon size={25} />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="marketing-section template-marketing">
        <div>
          <span className="eyebrow">MULAI LEBIH MUDAH</span>
          <h2>Fondasi untuk setiap kebutuhan.</h2>
          <p>
            Pilih template SKM, evaluasi layanan, kepuasan pelanggan, atau susun form sendiri. Simpan form dan
            presentasi sebagai template untuk pekerjaan berikutnya.
          </p>
          <Link href="/login?mode=signup" className="text-link">
            Buat workspace
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="marketing-template-list">
          {['Survei Kepuasan Masyarakat', 'Evaluasi Layanan', 'Kepuasan Pelanggan', 'Form kosong'].map(
            (title) => (
              <div key={title}>
                <FileText size={20} />
                <strong>{title}</strong>
                <Check size={16} />
              </div>
            ),
          )}
        </div>
      </section>
      <section className="marketing-section marketing-plan">
        <div>
          <span className="eyebrow">FREE PLAN</span>
          <h2>Ruang untuk memulai.</h2>
          <p>Fitur inti tersedia gratis selama pengujian. Paket berbayar dan checkout belum dibuka.</p>
        </div>
        <Link href="/pricing" className="btn btn-secondary">
          Lihat informasi plan
          <ArrowRight size={15} />
        </Link>
      </section>
      <section className="marketing-section marketing-faq">
        <h2>Pertanyaan yang sering muncul.</h2>
        {[
          [
            'Apakah saya masih perlu Google Forms?',
            'Form dibuat dan dijalankan di SurveyDash. Setiap jawaban tersimpan di workspace Anda.',
          ],
          [
            'Bisa untuk SKM dan survei lain?',
            'Bisa. Template SKM memakai sembilan unsur dan perhitungan IKM. Survei kustom memakai distribusi jawaban sesuai pertanyaan.',
          ],
          [
            'Apakah jawaban saya terlihat publik?',
            'Pengelolaan dan jawaban hanya tersedia kepada pemilik workspace. Visibilitas form diatur terpisah.',
          ],
          [
            'Bisa membuat template sendiri?',
            'Form, susunan presentasi, dan paket survei dapat disimpan dan dipakai kembali.',
          ],
        ].map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
      <section className="marketing-final">
        <h2>Siapkan ruang untuk suara berikutnya.</h2>
        <Link href="/login?mode=signup" className="btn btn-primary">
          Mulai gratis
          <ArrowRight size={16} />
        </Link>
      </section>
    </PublicFrame>
  );
}
