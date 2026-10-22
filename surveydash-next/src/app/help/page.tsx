import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Mail, ChevronDown } from 'lucide-react';
import { PublicFrame } from '@/components/public-frame';
import { guideSteps } from '@/lib/guides';
import './help-center.css';
export const metadata = { title: 'Bantuan — SurveyDash Studio', alternates: { canonical: '/help' } };
const extraHelp = [
  [
    'Bagaimana melihat peta wilayah tugas surveyor?',
    'Buka menu Surveyor, lalu pilih Peta. Pada baris surveyor, klik wilayah untuk menetapkan provinsinya. Klik provinsi pada peta untuk melihat tim di sana. Gunakan filter survei dan status untuk membatasi tampilan. Penugasan lama yang belum diberi provinsi masuk Belum diatur. Peta mengikuti wilayah tugas yang ditetapkan pengelola; jumlah respons di daftar berasal dari link penugasan.',
  ],
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
    'Di editor survei, buka tab Data → Unduh data, lalu pilih Excel (.xlsx) atau CSV. Unduhan berisi seluruh hasil pencarian, termasuk halaman lain, dan bisa diunggah ke Google Sheets. Menu Cleaning data membantu meninjau dugaan duplikat tanpa menghapus jawaban atau mengubah IKM.',
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
    'Di beranda workspace, pilih Impor Google Form. Jika sambungan Google aktif, sambungkan akun dan masukkan link editor form. Centang Sertakan jawaban responden, tinjau jumlah dan catatannya, lalu impor sebagai survei baru. Hasilnya draft privat; form sumber tetap di Google. Impor JSON juga tersedia. Ini salinan sekali impor, bukan sinkronisasi otomatis.',
  ],
  [
    'Bagaimana menambah pertanyaan dengan cepat?',
    'Buka tab Pertanyaan, klik Tambah pertanyaan, lalu isi teks dan pilih jenisnya. Klik judul pertanyaan untuk membuka atau menutup editor. Gunakan Duplikat untuk menyalin pertanyaan, atau Tempel daftar pilihan untuk memasukkan banyak pilihan sekaligus, satu pilihan per baris.',
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
            src="/brand/clay/results.webp"
            alt=""
            width={720}
            height={720}
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
                    src={`/brand/clay/${step.image}.webp`}
                    alt=""
                    width={720}
                    height={720}
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
