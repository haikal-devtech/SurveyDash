import { Receipt } from 'lucide-react';
import { EmptyState } from '@/components/ui';
export default function BillingPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Tagihan.</h1>
          <p>Pembayaran dan invoice workspace.</p>
        </div>
      </div>
      <section className="card">
        <EmptyState
          icon={<Receipt size={28} />}
          title="Belum ada invoice."
          description="Workspace menggunakan Free Plan. Gateway pembayaran belum dikonfigurasikan, sehingga checkout dan penagihan belum tersedia."
        />
      </section>
    </>
  );
}
