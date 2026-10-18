import Link from 'next/link';
import { Brand } from '@/components/brand';
import '@/app/invitation.css';
export default function InvitationNotFound() {
  return (
    <main className="invite-entry">
      <section className="invite-card">
        <Link href="/" className="invite-brand" aria-label="Beranda SurveyDash"><Brand /></Link>
        <h1>Undangan tidak berlaku</h1>
        <p>Minta link baru kepada pengelola survei.</p>
        <Link href="/" className="btn btn-primary">Ke beranda</Link>
      </section>
    </main>
  );
}
