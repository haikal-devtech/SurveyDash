import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Mail, ChevronDown } from 'lucide-react';
import { PublicFrame } from '@/components/public-frame';
import { guideSteps } from '@/lib/guides';
import './help-center.css';
export const metadata = { title: 'Bantuan — SurveyDash Studio', alternates: { canonical: '/help' } };
const extraHelp = [
  [
    'Bagaimana cara mengundang Surveyor?',
    'Di workspace, buka menu Surveyor. Pilih survei, lalu buat dan salin link undangan. Kirimkan sendiri link tersebut kepada Surveyor. Undangan berlaku 7 hari; Anda bisa memperbarui atau mencabutnya di halaman yang sama.',
  ],
  [
    'Bagaimana cara mulai membuat SKM?',
    'Klik Buat survei, lalu pilih Survei Kepuasan Masyarakat. Isi nama dan instansi, lalu tinjau 9 unsur pertanyaan. Setelah siap, buka tab Form dan buka surveinya agar responden bisa mengisi.',
  ],
  [
    'Bagaimana Surveyor mendapat tugas?',
    'Buka link undangan dari Pengelola. Masuk atau daftar sebagai Surveyor, lalu klik Bergabung. Di halaman Tugas survei, baca pertanyaan dan salin link responden dari kartu tugas Anda.',
  ],
  [
    'Apakah responden perlu akun?',
    'Tidak. Responden cukup membuka link survei, mengisi pertanyaan, dan mengirim jawaban. Jika link berasal dari Surveyor, nama Surveyor tampil di form dan tercatat otomatis.',
  ],
  [
    'Bagaimana mengelola jawaban?',
    'Di editor survei, buka tab Data. Anda bisa mencari, mengurutkan, memilih kolom, dan mengunduh CSV. Menu Cleaning data membantu meninjau dugaan duplikat; penandaan tidak menghapus jawaban atau mengubah IKM.',
  ],
  [
    'Bagaimana membuat presentasi?',
    'Buka tab Presentasi untuk menyusun slide dan grafik. Gunakan Bagikan untuk menerbitkan versi yang sudah ditinjau. Link presentasi dapat dicabut. Perubahan tampil ke penerima setelah Anda memperbarui versi berbagi.',
  ],
  [
    'Bagaimana memulihkan survei?',
    'Buka Semua survei. Pilih Diarsipkan atau Sampah, lalu pilih Pulihkan. Survei yang dipulihkan kembali sebagai draft.',
  ],
  [
    'Bagaimana jika lupa kata sandi?',
    'Jika pengiriman email pemulihan sudah tersedia, gunakan Lupa kata sandi di halaman masuk. Jika belum tersedia, hubungi help@surveydash.id melalui email.',
  ],
  [
    'Bagaimana mengimpor Google Forms?',
    'Jika sambungan Google tersedia, pilih Impor Google Forms, sambungkan akun, lalu masukkan link editor atau ID form. Tinjau pertanyaan sebelum membuat salinan. Impor JSON juga tersedia; form sumber dan jawaban di Google tidak diubah.',
  ],
];
export default function HelpPage() {
  return (
    <PublicFrame>
      <div className="help-center">
        <section className="help-hero">
          <div>
            <span className="help-eyebrow">
              <BookOpen size={15} /> BANTUAN SURVEYDASH
            </span>
            <h1>Mulai dari sini.</h1>
            <p>Pilih panduan yang sesuai dengan peran Anda.</p>
            <nav aria-label="Pilih panduan">
              <a href="#panduan-pengelola">
                Pengelola / SKM <ArrowRight size={15} />
              </a>
              <a href="#panduan-surveyor">
                Surveyor <ArrowRight size={15} />
              </a>
            </nav>
          </div>
          <Image
            src="/brand/photos/help.webp"
            alt=""
            width={1200}
            height={800}
            sizes="(max-width: 700px) 100vw, 400px"
          />
        </section>
        {(['manager', 'surveyor'] as const).map((role) => (
          <section
            key={role}
            id={role === 'manager' ? 'panduan-pengelola' : 'panduan-surveyor'}
            className="help-role-section"
          >
            <div className="help-section-title">
              <h2>{role === 'manager' ? 'Untuk Pengelola Survei / SKM' : 'Untuk Surveyor'}</h2>
              <Link href={`/login?role=${role}`}>
                Masuk <ArrowRight size={15} />
              </Link>
            </div>
            <div className="help-step-grid">
              {guideSteps[role].map((step, index) => (
                <article key={step.title}>
                  <Image
                    src={`/brand/photos/${step.image}.webp`}
                    alt=""
                    width={1200}
                    height={800}
                    sizes="(max-width: 700px) 100vw, 350px"
                  />
                  <div>
                    <span className="help-step-number">0{index + 1}</span>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        <section className="help-faq">
          <h2>Pertanyaan yang sering ditanyakan</h2>
          {extraHelp.map(([title, body]) => (
            <details key={title}>
              <summary>
                {title}
                <ChevronDown size={17} />
              </summary>
              <p>{body}</p>
            </details>
          ))}
        </section>
        <div className="help-contact">
          <span>
            <Mail size={22} />
          </span>
          <div>
            <h2>Masih butuh bantuan?</h2>
            <p>Kirim pertanyaan ke tim SurveyDash.</p>
          </div>
          <a className="btn btn-secondary" href="mailto:help@surveydash.id">
            Hubungi kami <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </PublicFrame>
  );
}
