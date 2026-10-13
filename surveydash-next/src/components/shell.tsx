'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Files,
  PanelsTopLeft,
  Globe,
  ChevronDown,
  ChevronRight,
  LogOut,
  Sparkles,
  Menu,
  X,
  CircleHelp,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Brand } from './brand';
import { Button } from './ui';

export function Shell({ children, name }: { children: React.ReactNode; name: string }) {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  return (
    <div className="workspace">
      <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
        <Link href="/studio" onClick={() => setMobile(false)}>
          <Brand />
        </Link>
        <div className="workspace-select">
          <span className="avatar-square">SD</span>
          <div>
            <strong>Workspace survei</strong>
            <small>Ruang kerja pribadi</small>
          </div>
          <ChevronDown size={12} style={{ marginLeft: 'auto', color: '#b4a9c0' }} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <Link
          className={`nav-item ${pathname === '/studio' ? 'active' : ''}`}
          href="/studio"
          onClick={() => setMobile(false)}
        >
          <LayoutDashboard size={16} />
          Ringkasan
        </Link>
        <Link
          className={`nav-item ${pathname.includes('/studio/') && pathname !== '/studio/templates' ? 'active' : ''}`}
          href="/studio#surveys"
          onClick={() => setMobile(false)}
        >
          <Files size={16} />
          Semua survei
        </Link>
        <Link
          className={`nav-item ${pathname === '/studio/templates' ? 'active' : ''}`}
          href="/studio/templates"
          onClick={() => setMobile(false)}
        >
          <PanelsTopLeft size={16} />
          Template
        </Link>
        <Link className="nav-item" href="/surveys" target="_blank">
          <Globe size={16} />
          Portal responden
        </Link>
        <div className="sidebar-bottom">
          <div className="sidebar-callout">
            <Sparkles size={17} color="#b196d3" />
            <p>Satu ruang, seluruh proses.</p>
            <small>Dari pertanyaan pertama sampai presentasi hasil survei.</small>
          </div>
          <Link href="/studio/templates" className="nav-item">
            <CircleHelp size={15} />
            Mulai dari template
          </Link>
          <div className="profile">
            <span className="avatar">{name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{name}</strong>
              <small>Administrator workspace</small>
            </div>
            <button
              className="btn btn-ghost"
              aria-label="Keluar"
              style={{ marginLeft: 'auto', padding: 4 }}
              onClick={async () => {
                await authClient.signOut();
                window.location.href = '/login';
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
        {mobile && (
          <Button className="mobile-menu" variant="ghost" onClick={() => setMobile(false)}>
            <X size={16} />
            Tutup
          </Button>
        )}
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              className="mobile-menu"
              variant="ghost"
              onClick={() => setMobile(true)}
              aria-label="Buka menu"
            >
              <Menu size={17} />
            </Button>
            <span>Workspace</span>
            <ChevronRight size={12} />
            <strong>
              {pathname === '/studio'
                ? 'Ringkasan'
                : pathname === '/studio/templates'
                  ? 'Template'
                  : 'Kelola survei'}
            </strong>
          </div>
          <div className="topbar-right">
            <span>Form · Data · Insight</span>
            <span className="avatar" style={{ width: 27, height: 27 }}>
              {name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
