import Link from 'next/link';
import { ArrowRight, ClipboardList, UsersRound, FilePenLine } from 'lucide-react';
import { PublicFrame } from '@/components/public-frame';
import { BrandArtwork } from '@/components/brand-artwork';
import './role-entry.css';

const roles = [
  {
    id: 'manager',
    title: 'Pengelola Survei',
    description: 'Buat pertanyaan, undang Surveyor, dan kelola hasil survei atau SKM.',
    icon: ClipboardList,
  },
  {
    id: 'surveyor',
    title: 'Surveyor',
    description: 'Buka tugas dari pengelola dan bagikan link survei ke responden.',
    icon: UsersRound,
  },
];

export default function Page() {
  return (
    <PublicFrame>
      <div className="role-entry">
        <section className="entry-hero" aria-labelledby="entry-title">
          <div className="entry-hero-copy">
            <h1 id="entry-title">
              Ruang untuk
              <br />
              survei Anda.
            </h1>
            <p>Buat survei, bagikan bersama tim, lalu pahami setiap jawaban.</p>
          </div>
          <BrandArtwork asset="hero" className="entry-hero-art" eager />
        </section>
        <section id="pilih-peran" aria-labelledby="role-entry-title">
          <div className="entry-section-heading">
            <h2 id="role-entry-title">Masuk sebagai</h2>
          </div>
          <div className="role-entry-cards">
            {roles.map((role) => (
              <article key={role.id} className="role-entry-card" aria-labelledby={`${role.id}-role-title`}>
                <Link
                  href={`/login?role=${role.id}`}
                  className="entry-role-main"
                  aria-label={`Masuk sebagai ${role.title}`}
                >
                  <role.icon className="entry-role-icon" size={25} strokeWidth={1.6} aria-hidden="true" />
                  <div className="entry-role-body">
                    <h3 id={`${role.id}-role-title`}>{role.title}</h3>
                    <p>{role.description}</p>
                  </div>
                  <ArrowRight className="entry-role-arrow" size={20} aria-hidden="true" />
                </Link>
                <div className="entry-role-footer">
                  <span>Belum punya akun?</span>
                  <Link
                    href={`/login?role=${role.id}&mode=signup`}
                    aria-label={`Daftar sebagai ${role.title}`}
                  >
                    Daftar
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
        <Link href="/surveys" className="entry-respondent">
          <FilePenLine size={23} strokeWidth={1.6} aria-hidden="true" />
          <span>
            <strong>Ingin mengisi survei?</strong>
            <small>Langsung isi, tanpa login.</small>
          </span>
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
        <div className="entry-bottom-note">
          <span>Pengguna baru akan dipandu setelah masuk.</span>
          <Link href="/help">Butuh bantuan?</Link>
        </div>
      </div>
    </PublicFrame>
  );
}
