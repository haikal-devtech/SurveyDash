'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  LayoutDashboard,
  Files,
  PanelsTopLeft,
  Globe,
  Settings2,
  LogOut,
  Menu,
  Search,
  ArrowUpRight,
  ShieldCheck,
  ListChecks,
  UsersRound,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Brand } from './brand';
import { Button, Modal } from './ui';
import { UserAvatar } from './user-avatar';
import { ReturnWorkspace } from './admin-workspaces';
import { WorkspacePicker } from './workspace-picker';
import { WorkspacePermissions } from './workspace-permissions';
import type { WorkspaceChoice } from '@/lib/workspace-types';
import { workspaceRoleLabels, type WorkspaceRole } from '@/lib/workspace-role-model';
import { GuideButton, RoleGuide } from './role-guide';
import { DashboardMotionProvider } from './dashboard-motion-context';
import { MotionScene, SelectionRail } from './dashboard-motion';
import '@/app/workspace-experience.css';
export function Shell({
  children,
  name,
  image,
  workspace,
  isAdmin = false,
  managingOther = false,
  userId,
  workspaceChoices = [],
  currentOwnerId = userId,
  role = 'owner',
}: {
  children: React.ReactNode;
  name: string;
  image?: string | null;
  workspace: { name: string; description: string };
  isAdmin?: boolean;
  managingOther?: boolean;
  userId: string;
  workspaceChoices?: WorkspaceChoice[];
  currentOwnerId?: string;
  role?: WorkspaceRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const menuOpener = useRef<HTMLButtonElement | null>(null);
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
      'fieldwork',
      'activity',
    ].includes(section);
  const canvas = pathname.includes('/presentations/');
  const links = [
    { href: '/studio', label: 'Beranda', icon: LayoutDashboard },
    { href: '/studio/surveys', label: 'Semua survei', icon: Files },
    { href: '/studio/surveyors', label: 'Surveyor', icon: UsersRound },
    { href: '/studio/fieldwork', label: 'Operasi lapangan', icon: ListChecks },
    { href: '/studio/cleaning', label: 'Cleaning data', icon: ListChecks },
    { href: '/studio/templates', label: 'Template', icon: PanelsTopLeft },
    { href: '/surveys', label: 'Portal responden', icon: Globe },
    { href: '/studio/settings', label: 'Pengaturan', icon: Settings2 },
    ...(isAdmin ? [{ href: '/studio/admin', label: 'Admin workspace', icon: ShieldCheck }] : []),
  ].filter(
    (link) =>
      role !== 'coordinator' ||
      ['/studio', '/studio/surveyors', '/studio/fieldwork', '/studio/cleaning', '/studio/settings'].includes(
        link.href,
      ),
  );
  const sidebarContent = (
    <>
      <Link href="/studio" onClick={() => setMobile(false)}>
        <Brand />
      </Link>
      <Link
        href={role === 'coordinator' ? '/studio/fieldwork' : '/studio/settings/workspace'}
        className="workspace-select"
        onClick={() => setMobile(false)}
      >
        <span className="avatar-square">SD</span>
        <div>
          <strong>{workspace.name}</strong>
          <small>{workspace.description || 'Ruang kerja pribadi'}</small>
          <small>{workspaceRoleLabels[role]}</small>
        </div>
      </Link>
      <SelectionRail className="workspace-nav" label="Menu workspace" activeKey={pathname} surface>
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            target={item.href === '/surveys' ? '_blank' : undefined}
            className={`nav-item ${(item.href === '/studio' ? pathname === item.href : pathname.startsWith(item.href)) ? 'active' : ''}`}
            aria-current={
              (item.href === '/studio' ? pathname === item.href : pathname.startsWith(item.href))
                ? 'page'
                : undefined
            }
            onClick={() => setMobile(false)}
          >
            <item.icon size={18} />
            {item.label}
            {item.href === '/surveys' && <ArrowUpRight size={12} style={{ marginLeft: 'auto' }} />}
          </Link>
        ))}
      </SelectionRail>
      <WorkspacePicker
        choices={workspaceChoices}
        currentOwnerId={currentOwnerId}
        currentName={workspace.name}
      />
      <div className="sidebar-bottom">
        <div className="workspace-help">
          {(role === 'owner' || role === 'editor') && <GuideButton role="manager" />}{' '}
          <Link href="/help">Bantuan lainnya</Link>
        </div>
        <div className="profile">
          <UserAvatar name={name} image={image} />
          <Link href="/studio/settings/account" onClick={() => setMobile(false)}>
            <strong>{name}</strong>
            <small>{isAdmin ? 'Admin platform' : 'Pengelola Survei'}</small>
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
    </>
  );
  return (
    <WorkspacePermissions role={role}>
      <DashboardMotionProvider>
        <div
          data-workspace-owner={currentOwnerId}
          data-workspace-role={role}
          data-dashboard-motion=""
          className={`workspace ${focused ? 'focus-workspace' : ''} ${canvas ? 'slide-workspace' : ''} ${!focused && !canvas ? 'has-bottom-nav' : ''}`}
        >
          <aside className="sidebar">{sidebarContent}</aside>
          <Modal
            open={mobile}
            onOpenChange={setMobile}
            title="Menu SurveyDash"
            description="Pilih halaman ruang survei."
            className="workspace-mobile-drawer"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              menuOpener.current?.focus();
            }}
          >
            <div
              className="workspace-mobile-menu"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('[data-guide-trigger]')) setMobile(false);
              }}
            >
              {sidebarContent}
            </div>
          </Modal>
          <main className="main">
            {!canvas && (
              <header className="topbar">
                <Button
                  className={`mobile-menu ${focused ? 'focus-menu' : ''}`}
                  variant="ghost"
                  aria-label="Buka menu"
                  aria-haspopup="dialog"
                  aria-expanded={mobile}
                  onClick={(event) => {
                    menuOpener.current = event.currentTarget;
                    setMobile(true);
                  }}
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
            <MotionScene className="content" motionKey={pathname}>
              {managingOther && <ReturnWorkspace userId={userId} isAdmin={isAdmin} />}
              {children}
            </MotionScene>
          </main>
          {!focused && !canvas && (
            <nav className="workspace-bottom-nav" aria-label="Navigasi utama">
              {links.slice(0, 3).map((item) => {
                const active =
                  item.href === '/studio' ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
                    <item.icon size={21} aria-hidden="true" />
                    <span>{item.href === '/studio/surveys' ? 'Survei' : item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                aria-expanded={mobile}
                aria-haspopup="dialog"
                onClick={(event) => {
                  menuOpener.current = event.currentTarget;
                  setMobile(true);
                }}
              >
                <Menu size={21} aria-hidden="true" />
                <span>Menu</span>
              </button>
            </nav>
          )}
          {(role === 'owner' || role === 'editor') && <RoleGuide role="manager" />}
        </div>
      </DashboardMotionProvider>
    </WorkspacePermissions>
  );
}
