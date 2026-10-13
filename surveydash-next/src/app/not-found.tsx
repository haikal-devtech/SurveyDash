import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="public-shell">
      <div className="empty-state">
        <h1 style={{ fontSize: 40, marginBottom: 12 }}>404</h1>
        <h3>Halaman tidak tersedia.</h3>
        <p>Link mungkin tidak benar, atau administrator membatasi akses ke survei ini.</p>
        <Link className="btn btn-primary" href="/surveys">
          Buka portal responden
        </Link>
      </div>
    </main>
  );
}
