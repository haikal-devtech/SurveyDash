import type { Metadata } from 'next';
import './globals.css';
import './product.css';
import './presentation.css';
import './shared.css';
import './surveyor.css';
import '@fontsource-variable/inter';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './soft-clay.css';
import './mobile.css';
import './dashboard-motion.css';
import './import-editor.css';
import './analytics-studio.css';
import './dark-surfaces.css';
import './theme.css';
import './studio-refinement.css';
import './motion-studio.css';
import './assignment-map.css';
import './workspace-team.css';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { themeBootstrap } from '@/lib/theme';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3100'),
  title: 'SurveyDash Studio — Ruang kerja survei',
  description: 'Buat form, kelola jawaban, dan susun presentasi survei dalam satu workspace.',
  openGraph: {
    title: 'SurveyDash Studio',
    description: 'Form, data, dan presentasi survei dalam satu workspace.',
    type: 'website',
    locale: 'id_ID',
    images: [
      {
        url: '/product-workspace.png',
        width: 1440,
        height: 900,
        alt: 'Workspace SurveyDash dengan data simulasi',
      },
    ],
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="clay-ui">
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        {children}
        <ThemeSwitcher />
      </body>
    </html>
  );
}
