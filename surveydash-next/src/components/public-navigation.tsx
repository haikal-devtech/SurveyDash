'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button, Modal } from './ui';

const links = [
  { href: '/features', label: 'Fitur' },
  { href: '/pricing', label: 'Plan' },
  { href: '/help', label: 'Bantuan' },
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
        description="Pilih halaman yang ingin Anda buka."
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
          <Link href="/login" onClick={() => setOpen(false)}>
            Masuk
          </Link>
          <Link href="/login?mode=signup" className="btn btn-primary" onClick={() => setOpen(false)}>
            Mulai gratis
          </Link>
        </nav>
      </Modal>
    </div>
  );
}
