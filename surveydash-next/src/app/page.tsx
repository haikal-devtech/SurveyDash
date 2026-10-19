import Link from 'next/link';
import { ArrowRight, ClipboardList, UsersRound } from 'lucide-react';
import { PublicFrame } from '@/components/public-frame';
import './role-entry.css';

export default function Page() {
  return (
    <PublicFrame>
      <section className="role-entry" aria-labelledby="role-entry-title">
        <h1 id="role-entry-title">Apa yang ingin Anda lakukan?</h1>
        <div id="pilih-peran" className="role-entry-cards">
          <article className="role-entry-card" aria-labelledby="manager-role-title">
            <span className="role-entry-icon" aria-hidden="true">
              <ClipboardList size={28} />
            </span>
            <h2 id="manager-role-title">Pengelola Survei</h2>
            <p>Buat pertanyaan dan lihat hasil survei.</p>
            <Link
              href="/login?role=manager"
              className="btn btn-primary"
              aria-label="Masuk sebagai Pengelola Survei"
            >
              Masuk <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <p className="role-entry-register">
              Belum punya akun? <Link href="/login?role=manager&mode=signup">Daftar</Link>
            </p>
          </article>
          <article className="role-entry-card role-entry-card-surveyor" aria-labelledby="surveyor-role-title">
            <span className="role-entry-icon" aria-hidden="true">
              <UsersRound size={28} />
            </span>
            <h2 id="surveyor-role-title">Surveyor</h2>
            <p>Terima tugas dan bagikan link survei.</p>
            <Link href="/login?role=surveyor" className="btn btn-primary" aria-label="Masuk sebagai Surveyor">
              Masuk <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <p className="role-entry-register">
              Belum punya akun? <Link href="/login?role=surveyor&mode=signup">Daftar</Link>
            </p>
          </article>
        </div>
        <p className="role-entry-respondent">
          Mau mengisi survei?{' '}
          <Link href="/surveys">
            Buka survei <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </p>
      </section>
    </PublicFrame>
  );
}
