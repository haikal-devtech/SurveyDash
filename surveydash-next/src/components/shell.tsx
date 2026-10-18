'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Files,
  PanelsTopLeft,
  Globe,
  Settings2,
  LogOut,
  Menu,
  X,
  Search,
  ArrowUpRight,
  ShieldCheck,
  ListChecks,
  UsersRound,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import type { PlanUsage } from '@/lib/plans';
import { Brand } from './brand';
import { Button } from './ui';
import { UserAvatar } from './user-avatar';
import { ReturnWorkspace } from './admin-workspaces';
export function Shell({
  children,
  name,
  image,
  workspace,
  usage,
  isAdmin = false,
  managingOther = false,
  userId,
}: {
  children: React.ReactNode;
  name: string;
  image?: string | null;
  workspace: { name: string; description: string };
  usage: PlanUsage;
  isAdmin?: boolean;
  managingOther?: boolean;
  userId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState('');
  const section = pathname.split('/')[2];
  const focused =
    !!section &&
    ![
      'templates',
      'surveys',
      'surveyors',
      'settings',
      'search',
      'import',
      'onboarding',
      'admin',
      'cleaning',
    ].includes(section);
  const canvas = pathname.includes('/presentations/');
  const links = [
    { href: '/studio', label: 'Beranda', icon: LayoutDashboard },
    { href: '/studio/surveys', label: 'Semua survei', icon: Files },
    { href: '/studio/surveyors', label: 'Surveyor', icon: UsersRound },
    { href: '/studio/cleaning', label: 'Cleaning data', icon: ListChecks },
    { href: '/studio/templates', label: 'Template', icon: PanelsTopLeft },
    { href: '/surveys', label: 'Portal responden', icon: Globe },
    { href: '/studio/settings', label: 'Pengaturan', icon: Settings2 },
    ...(isAdmin ? [{ href: '/studio/admin', label: 'Admin workspace', icon: ShieldCheck }] : []),
  ];
  return (
    <div className={`workspace ${focused ? 'focus-workspace' : ''} ${canvas ? 'slide-workspace' : ''}`}>
      <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
        <Link href="/studio" onClick={() => setMobile(false)}>
          <Brand />
        </Link>
        <Link href="/studio/settings/workspace" className="workspace-select" onClick={() => setMobile(false)}>
          <span className="avatar-square">SD</span>
          <div>
            <strong>{workspace.name}</strong>
            <small>{workspace.description || 'Ruang kerja pribadi'}</small>
          </div>
        </Link>
        <nav className="workspace-nav" aria-label="Menu workspace">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              target={item.href === '/surveys' ? '_blank' : undefined}
              className={`nav-item ${(item.href === '/studio' ? pathname === item.href : pathname.startsWith(item.href)) ? 'active' : ''}`}
              onClick={() => setMobile(false)}
            >
              <item.icon size={18} />
              {item.label}
              {item.href === '/surveys' && <ArrowUpRight size={12} style={{ marginLeft: 'auto' }} />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <section className="plan-card">
            <strong>Free Plan</strong>
            {usage.responseLimit !== null && (
              <div className="plan-progress">
                <span style={{ width: `${Math.min(100, (usage.responses / usage.responseLimit) * 100)}%` }} />
              </div>
            )}
            <p>
              {usage.responses.toLocaleString('id-ID')}
              {usage.responseLimit !== null ? ` / ${usage.responseLimit.toLocaleString('id-ID')}` : ''}{' '}
              respons bulan ini
            </p>
            <p>
              {usage.activeSurveys}
              {usage.activeLimit !== null ? ` / ${usage.activeLimit}` : ''} survei aktif
            </p>
            {usage.simulatedResponses > 0 && <small>Termasuk data simulasi</small>}
            <Link href="/studio/settings/membership" className="btn btn-secondary">
              Kelola plan
            </Link>
          </section>
          <div className="profile">
            <UserAvatar name={name} image={image} />
            <Link href="/studio/settings/account">
              <strong>{name}</strong>
              <small>{isAdmin ? 'Admin platform' : 'Akses penuh workspace'}</small>
            </Link>
            <button
              className="btn btn-ghost"
              aria-label="Keluar"
              onClick={async () => {
                await authClient.signOut();
                router.replace('/login');
                router.refresh();
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
        <Button
          className="sidebar-close"
          variant="ghost"
          aria-label="Tutup menu"
          onClick={() => setMobile(false)}
        >
          <X size={18} />
        </Button>
      </aside>
      <main className="main">
        {!canvas && (
          <header className="topbar">
            <Button
              className={`mobile-menu ${focused ? 'focus-menu' : ''}`}
              variant="ghost"
              aria-label="Buka menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={18} />
            </Button>
            <form
              className="global-search"
              onSubmit={(event) => {
                event.preventDefault();
                if (query.trim()) router.push(`/studio/search?query=${encodeURIComponent(query.trim())}`);
              }}
            >
              <Search size={19} />
              <input
                aria-label="Cari survei dan template"
                placeholder="Cari survei, template…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={200}
              />
            </form>
            <Link className="topbar-account" href="/studio/settings/account">
              <UserAvatar name={name} image={image} />
              <strong>{name.split(' ')[0]}</strong>
            </Link>
          </header>
        )}
        <div className="content">
          {managingOther && <ReturnWorkspace userId={userId} />}
          {children}
        </div>
      </main>
    </div>
  );
}
