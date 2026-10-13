'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty-state">
      <h3>Halaman belum dapat dimuat.</h3>
      <p>Coba muat ulang. Perubahan yang sudah tersimpan tetap ada di database.</p>
      <button className="btn btn-primary" onClick={reset}>
        Coba lagi
      </button>
    </div>
  );
}
