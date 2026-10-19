import Link from 'next/link';
import { UserRound, Building2, FileInput, ArrowRight } from 'lucide-react';
const pages = [
  { path: 'account', title: 'Akun', description: 'Nama tampilan dan alamat email akun.', icon: UserRound },
  {
    path: 'workspace',
    title: 'Workspace',
    description: 'Identitas ruang kerja pribadi Anda.',
    icon: Building2,
  },
  {
    path: 'import',
    title: 'Impor Google Forms',
    description: 'Pindahkan instrumen dari JSON Google Forms.',
    icon: FileInput,
  },
];
export default function SettingsPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Pengaturan workspace.</h1>
          <p>Kelola akun, workspace, dan impor survei.</p>
        </div>
      </div>
      <div className="settings-links">
        {pages.map((page) => (
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
