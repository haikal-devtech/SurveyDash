import Link from 'next/link';
import { Brand } from './brand';
export function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-site">
      <header className="marketing-header">
        <Link href="/">
          <Brand />
        </Link>
        <nav aria-label="Navigasi website">
          <Link href="/features">Fitur</Link>
          <Link href="/pricing">Plan</Link>
          <Link href="/help">Bantuan</Link>
        </nav>
        <div className="actions">
          <Link href="/login" className="marketing-signin">
            Masuk
          </Link>
          <Link href="/login?mode=signup" className="btn btn-primary">
            Mulai gratis
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="marketing-footer">
        <div>
          <Brand />
          <p>Dari pertanyaan pertama hingga pemahaman yang lebih baik.</p>
        </div>
        <nav aria-label="Tautan bantuan">
          <Link href="/privacy">Privasi</Link>
          <Link href="/terms">Ketentuan</Link>
          <Link href="/help">Bantuan</Link>
          <Link href="/contact">Kontak</Link>
          <Link href="/surveys">Portal responden</Link>
        </nav>
        <small>SurveyDash Studio · Workspace survei pribadi</small>
      </footer>
    </div>
  );
}
