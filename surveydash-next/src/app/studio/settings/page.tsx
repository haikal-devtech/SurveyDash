import Link from 'next/link';
import { UserRound, Building2, FileInput, ArrowRight } from 'lucide-react';
import { requireWorkspacePage as requireWorkspaceUser } from '@/lib/workspace-page';
const pages = [
  { path: 'account', title: 'Akun', description: 'Nama tampilan dan alamat email akun.', icon: UserRound },
  {
    path: 'workspace',
    title: 'Workspace',
    description: 'Identitas workspace dan undangan rekan Pengelola.',
    icon: Building2,
  },
  {
    path: 'import',
    title: 'Impor Google Forms',
    description: 'Pindahkan instrumen dari JSON Google Forms.',
    icon: FileInput,
  },
];
export default async function SettingsPage() {
  const { workspaceRole } = await requireWorkspaceUser({ area: 'shell' });
  const visiblePages = pages.filter(
    (page) =>
      page.path === 'account' ||
      (workspaceRole !== 'coordinator' && (page.path !== 'import' || workspaceRole !== 'viewer')),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Pengaturan.</h1>
          <p>Atur akun dan ruang kerja sesuai akses Anda.</p>
        </div>
      </div>
      <div className="settings-links">
        {visiblePages.map((page) => (
          <Link
            className="card settings-link"
            key={page.path}
            href={page.path === 'import' ? '/studio/import' : `/studio/settings/${page.path}`}
          >
            <page.icon size={22} />
            <div>
              <h3>{page.title}</h3>
              <p>{page.description}</p>
            </div>
            <ArrowRight size={17} />
          </Link>
        ))}
      </div>
    </>
  );
}
