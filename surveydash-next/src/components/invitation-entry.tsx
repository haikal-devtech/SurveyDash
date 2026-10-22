import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { Brand } from './brand';
import type { ReactNode } from 'react';
export function InvitationEntry({
  title,
  description,
  children,
}: Readonly<{ title: string; description: string; children: ReactNode }>) {
  return (
    <main className="invite-entry">
      <section className="invite-card">
        <Link href="/" className="invite-brand" aria-label="Beranda SurveyDash">
          <Brand />
        </Link>
        <div className="invite-icon">
          <UserPlus size={26} aria-hidden="true" />
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </section>
    </main>
  );
}
