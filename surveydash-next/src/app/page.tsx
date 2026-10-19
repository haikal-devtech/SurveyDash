import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ClipboardList, UsersRound, Check, FilePenLine } from 'lucide-react';
import { PublicFrame } from '@/components/public-frame';
import './role-entry.css';

const roles = [
  {
    id: 'manager',
    title: 'Pengelola Survei',
    description: 'Buat survei atau SKM, kelola Surveyor, dan lihat hasilnya.',
    icon: ClipboardList,
    image: 'manager',
  },
  {
    id: 'surveyor',
    title: 'Surveyor',
    description: 'Terima tugas dan bagikan link survei kepada responden.',
    icon: UsersRound,
    image: 'surveyor',
  },
];
export default function Page() {
  return (
    <PublicFrame>
      <div className="role-entry">
        <section className="entry-hero" aria-labelledby="entry-title">
          <div className="entry-hero-copy">
            <p className="entry-eyebrow">
              <span /> RUANG UNTUK SETIAP SUARA
            </p>
            <h1 id="entry-title">
              Survei lebih mudah.
              <br />
              <em>Hasil lebih bermakna.</em>
            </h1>
            <p>Dari membuat pertanyaan sampai memahami jawaban. Mulai bersama SurveyDash.</p>
            <a href="#pilih-peran" className="entry-start">
              Pilih peran Anda <ArrowRight size={18} />
            </a>
          </div>
          <div className="entry-hero-visual">
            <Image
              src="/brand/photos/hero.webp"
              alt="Ilustrasi dua peneliti berdiskusi menggunakan laptop"
              width={1200}
              height={800}
              sizes="(max-width: 700px) 100vw, 48vw"
              preload
            />
            <span className="entry-photo-label">
              <Check size={16} /> Satu tempat. Dari form sampai hasil.
            </span>
          </div>
        </section>
        <section id="pilih-peran" aria-labelledby="role-entry-title">
          <div className="entry-section-heading">
            <h2 id="role-entry-title">Apa yang ingin Anda lakukan?</h2>
            <span>Pilih untuk mulai</span>
          </div>
          <div className="role-entry-cards">
            {roles.map((role) => (
              <article
                key={role.id}
                className={`role-entry-card role-entry-card-${role.id}`}
                aria-labelledby={`${role.id}-role-title`}
              >
                <Image
                  src={`/brand/photos/${role.image}.webp`}
                  alt=""
                  width={1200}
                  height={800}
                  sizes="(max-width: 700px) 90px, 150px"
                  className="entry-role-photo"
                />
                <div className="entry-role-body">
                  <span className="role-entry-icon" aria-hidden="true">
                    <role.icon size={20} />
                  </span>
                  <h3 id={`${role.id}-role-title`}>{role.title}</h3>
                  <p>{role.description}</p>
                  <div className="entry-role-actions">
                    <Link
                      href={`/login?role=${role.id}`}
                      className="btn btn-primary"
                      aria-label={`Masuk sebagai ${role.title}`}
                    >
                      Masuk <ArrowRight size={16} />
                    </Link>
                    <Link
                      href={`/login?role=${role.id}&mode=signup`}
                      className="entry-register"
                      aria-label={`Daftar sebagai ${role.title}`}
                    >
                      Daftar
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        <Link href="/surveys" className="entry-respondent">
          <span className="entry-respondent-icon">
            <FilePenLine size={22} />
          </span>
          <span>
            <strong>Mau mengisi survei?</strong>
            <small>Langsung isi, tanpa login.</small>
          </span>
          <span className="entry-respondent-action">
            Buka survei <ArrowRight size={17} />
          </span>
        </Link>
        <div className="entry-bottom-note">
          <span>Baru pertama kali? Ada panduan singkat setelah masuk.</span>
          <Link href="/help">
            Lihat bantuan <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </PublicFrame>
  );
}
