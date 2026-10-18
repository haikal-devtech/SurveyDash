'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button, Modal } from './ui';

const links = [
  { href: '/login?role=surveyor', label: 'Surveyor' },
  { href: '/features', label: 'Fitur' },
  { href: '/help', label: 'Bantuan' },
  { href: '/pricing', label: 'Plan' },
  { href: '/contact', label: 'Kontak' },
];

export function PublicNavigation() {
  const [open, setOpen] = useState(false);
  return (
    <div className="public-navigation">
      <nav aria-label="Navigasi website">
        {links.slice(0, 3).map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <Button
        variant="ghost"
        className="marketing-menu"
        aria-label="Buka menu website"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu size={20} />
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Menu SurveyDash Studio"
        description="Pilih peran Anda atau buka bantuan."
      >
        <nav className="public-mobile-links" aria-label="Navigasi website mobile">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/surveys" onClick={() => setOpen(false)}>
            Portal responden
          </Link>
          <Link href="/login?role=manager" onClick={() => setOpen(false)}>
            Masuk sebagai Pengelola Survei
          </Link>
          <Link
            href="/login?role=surveyor&mode=signup"
            className="btn btn-primary"
            onClick={() => setOpen(false)}
          >
            Daftar sebagai Surveyor
          </Link>
        </nav>
      </Modal>
    </div>
  );
}
