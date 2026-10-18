import Link from 'next/link';
import { ArrowRight, ClipboardList, Link2, ListChecks, Send, UserRound, UsersRound } from 'lucide-react';
import { PublicFrame } from '@/components/public-frame';
import './role-entry.css';

const steps = [
  {
    title: 'Pengelola menyiapkan survei',
    text: 'Susun pertanyaan, terbitkan form, lalu tugaskan surveyor yang akan membantu menyebarkannya.',
    icon: ClipboardList,
  },
  {
    title: 'Surveyor membagikan link',
    text: 'Buka tugas, baca pertanyaannya, lalu salin link pribadi untuk dikirim kepada responden.',
    icon: Send,
  },
  {
    title: 'Responden mengisi form',
    text: 'Nama surveyor terlihat di form. Asal link tercatat bersama jawaban tanpa perlu diketik ulang.',
    icon: ListChecks,
  },
];

export default function Page() {
  return (
    <PublicFrame>
      <div className="role-entry">
        <section className="role-entry-hero" aria-labelledby="role-entry-title">
          <span className="eyebrow">SURVEYDASH STUDIO</span>
          <h1 id="role-entry-title">
            Mulai dari <span>peran Anda.</span>
          </h1>
          <p>Buat survei atau bantu membagikannya. Pilih pintu masuk yang sesuai.</p>
          <div id="pilih-peran" className="role-entry-cards">
            <article className="role-entry-card" aria-labelledby="manager-role-title">
              <span className="role-entry-icon" aria-hidden="true">
                <ClipboardList size={25} />
              </span>
              <span className="role-entry-kicker">SAYA MEMBUAT SURVEI</span>
              <h2 id="manager-role-title">Pengelola Survei</h2>
              <p>Untuk perusahaan, instansi, atau Anda yang menyiapkan pertanyaan dan mengelola hasil.</p>
              <ul>
                <li>Susun dan terbitkan pertanyaan</li>
                <li>Tugaskan surveyor untuk menyebarkan form</li>
                <li>Tinjau jawaban, insight, dan presentasi</li>
              </ul>
              <Link href="/login?role=manager" className="btn btn-primary">
                Masuk sebagai Pengelola
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/login?role=manager&mode=signup" className="role-entry-register">
                Belum punya akun? Daftar Pengelola
              </Link>
            </article>
            <article
              className="role-entry-card role-entry-card-surveyor"
              aria-labelledby="surveyor-role-title"
            >
              <span className="role-entry-icon" aria-hidden="true">
                <UsersRound size={25} />
              </span>
              <span className="role-entry-kicker">SAYA MEMBAGIKAN SURVEI</span>
              <h2 id="surveyor-role-title">Surveyor</h2>
              <p>Untuk Anda yang menerima tugas dan mengirimkan link survei kepada responden.</p>
              <ul>
                <li>Lihat hanya survei yang ditugaskan</li>
                <li>Baca pertanyaan tanpa mengubahnya</li>
                <li>Bagikan link pribadi dengan nama Anda</li>
              </ul>
              <Link href="/login?role=surveyor" className="btn btn-primary">
                Masuk sebagai Surveyor
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/login?role=surveyor&mode=signup" className="role-entry-register">
                Belum punya akun? Daftar Surveyor
              </Link>
            </article>
          </div>
          <div className="role-entry-respondent">
            <UserRound size={21} aria-hidden="true" />
            <div>
              <strong>Ingin mengisi survei?</strong>
              <p>Buka link dari surveyor Anda, atau cari survei publik di portal responden.</p>
            </div>
            <Link href="/surveys" className="text-link">
              Portal responden
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="role-entry-flow" aria-labelledby="role-flow-title">
          <span className="eyebrow">CARA KERJA</span>
          <h2 id="role-flow-title">Satu survei. Peran yang jelas.</h2>
          <div className="role-entry-steps">
            {steps.map((step, index) => (
              <article key={step.title}>
                <span className="role-entry-step-number">0{index + 1}</span>
                <step.icon size={23} aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="role-entry-note" aria-labelledby="surveyor-profile-title">
          <span className="role-entry-icon" aria-hidden="true">
            <Link2 size={23} />
          </span>
          <div>
            <h2 id="surveyor-profile-title">Baru bergabung sebagai surveyor?</h2>
            <p>
              Setelah masuk, lengkapi nama, username unik, dan informasi rekening pribadi. Anda dapat membuka
              tugas setelah Pengelola Survei menugaskan akun Anda. Rekening tidak ditampilkan pada link atau
              form responden.
            </p>
            <Link href="/privacy" className="text-link">
              Baca penggunaan data pribadi
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="role-entry-faq" aria-labelledby="role-faq-title">
          <h2 id="role-faq-title">Sebelum mulai.</h2>
          <details>
            <summary>Apa bedanya Pengelola Survei dan Surveyor?</summary>
            <p>
              Pengelola membuat pertanyaan, menugaskan surveyor, dan meninjau hasil. Surveyor membuka survei
              yang ditugaskan dan membagikan link pribadi. Akses surveyor tidak memberi izin mengubah
              pertanyaan atau melihat tabel jawaban responden.
            </p>
          </details>
          <details>
            <summary>Apakah responden perlu menulis nama surveyor?</summary>
            <p>
              Tidak. Jika membuka link pribadi surveyor, form menampilkan namanya dan mencatat asal link saat
              jawaban dikirim. Link bisa diteruskan oleh penerima, jadi asal link bukan bukti identitas orang
              yang mengisi.
            </p>
          </details>
          <details>
            <summary>Apakah nama lengkap harus berbeda dengan semua pengguna?</summary>
            <p>
              Nama lengkap boleh sama. Username surveyor seperti @haikal harus unik agar pengelola dan
              responden dapat membedakan akun.
            </p>
          </details>
          <details>
            <summary>Apakah rekening diminta kepada setiap responden?</summary>
            <p>
              Tidak. Rekening profil diminta kepada surveyor. Responden hanya diminta informasi rekening bila
              Pengelola Survei secara khusus memasukkan pertanyaan tersebut ke form.
            </p>
          </details>
        </section>
      </div>
    </PublicFrame>
  );
}
