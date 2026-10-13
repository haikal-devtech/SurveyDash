import type { Metadata } from 'next';
import './globals.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
export const metadata: Metadata = {
  title: 'SurveyDash Studio — Ruang kerja survei',
  description: 'Buat form, kelola jawaban, dan susun presentasi survei dalam satu workspace.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
