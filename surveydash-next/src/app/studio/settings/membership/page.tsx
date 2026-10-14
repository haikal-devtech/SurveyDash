import { requireWorkspaceUser } from '@/lib/http';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUsage } from '@/lib/workspace-repository';
import { Badge } from '@/components/ui';
export default async function MembershipPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const workspaceUser = await requireWorkspaceUser();
  const usage = await getUsage(workspaceUser.ownerId);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Plan dan penggunaan.</h1>
          <p>Ringkasan pemakaian workspace Anda pada {usage.period}.</p>
        </div>
        <Badge tone="purple">Free Plan</Badge>
      </div>
      <section className="card membership-card">
        <h2>Gratis untuk pengujian</h2>
        <p>Form, data, analisis, template, dan presentasi tersedia di workspace pribadi.</p>
        <div className="usage-grid">
          <div>
            <strong>{usage.responses.toLocaleString('id-ID')}</strong>
            <span>Respons bulan ini{usage.responseLimit !== null ? ` / ${usage.responseLimit}` : ''}</span>
          </div>
          <div>
            <strong>{usage.activeSurveys}</strong>
            <span>Survei aktif{usage.activeLimit !== null ? ` / ${usage.activeLimit}` : ''}</span>
          </div>
          <div>
            <strong>{usage.totalSurveys}</strong>
            <span>Survei tersimpan</span>
          </div>
        </div>
        <p className="hint">
          {usage.simulatedResponses > 0
            ? `${usage.simulatedResponses} respons berasal dari contoh simulasi. `
            : ''}
          {usage.responseLimit === null
            ? 'Batas produk belum diberlakukan selama pengujian.'
            : 'Pemakaian respons dihitung per bulan kalender. Data historis tetap tersimpan saat batas tercapai.'}
        </p>
      </section>
      <section id="upgrade" className="card membership-card">
        <h2>Paket berbayar belum dibuka</h2>
        <p>
          Checkout, pembayaran, dan invoice belum diaktifkan. Tidak ada biaya atau langganan berbayar yang
          dibuat dari akun ini.
        </p>
        <Link href="/pricing" className="text-link">
          Lihat informasi plan
        </Link>
      </section>
    </>
  );
}
