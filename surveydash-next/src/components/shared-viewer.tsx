'use client';
import Link from 'next/link';
import { useEffect, useEffectEvent, useState } from 'react';
import type { SharedSnapshot } from '@/lib/share-repository';
import { SlideThumbnail } from './slide-renderer';
import { Button, Badge } from './ui';
import { Brand } from './brand';
export function SharedViewer({ token, initialSnapshot }: { token: string; initialSnapshot: SharedSnapshot }) {
  const [snapshot, setSnapshot] = useState<SharedSnapshot | null>(initialSnapshot);
  const [index, setIndex] = useState(0);
  const [offline, setOffline] = useState(false);
  const keyHandler = useEffectEvent((event: KeyboardEvent) => {
    if (!snapshot) return;
    if (event.key === 'ArrowRight') setIndex((i) => Math.min(snapshot.slides.length - 1, i + 1));
    if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
  });
  useEffect(() => {
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function check() {
      if (running || controller.signal.aborted || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const response = await fetch(`/api/shared/${token}`, {
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'omit',
        });
        if (response.status === 404) {
          setSnapshot(null);
          return;
        }
        if (!response.ok) throw Error('Unavailable');
        const data: SharedSnapshot = await response.json();
        setSnapshot(data);
        setIndex((i) => Math.min(i, data.slides.length - 1));
        setOffline(false);
      } catch {
        if (!controller.signal.aborted) setOffline(true);
      } finally {
        running = false;
      }
    }
    const timer = setInterval(() => void check(), 15000);
    function visible() {
      void check();
    }
    document.addEventListener('visibilitychange', visible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [token]);
  if (!snapshot)
    return (
      <main className="shared-unavailable">
        <Brand />
        <h1>Link presentasi sudah tidak tersedia.</h1>
        <p>Pemilik mungkin mencabut link atau mengarsipkan dokumen.</p>
        <Link href="/" className="btn btn-secondary">
          Ke SurveyDash
        </Link>
      </main>
    );
  return (
    <main className="shared-presentation">
      <header>
        <Link href="/">
          <Brand />
        </Link>
        <div>
          <strong>{snapshot.title}</strong>
          <span>
            Versi dibagikan ·{' '}
            {new Date(snapshot.publishedAt).toLocaleDateString('id-ID', {
              dateStyle: 'long',
              timeZone: 'Asia/Jakarta',
            })}
          </span>
        </div>
        {snapshot.demo && <Badge>Data simulasi</Badge>}
      </header>
      {offline && (
        <p className="banner" role="status">
          Koneksi terputus. Menampilkan versi terakhir yang berhasil dimuat.
        </p>
      )}
      <div className="shared-slide">
        <SlideThumbnail slide={snapshot.slides[index]} assetBase={`/api/shared/${token}/assets`} />
      </div>
      <nav aria-label="Navigasi slide">
        <Button variant="secondary" disabled={!index} onClick={() => setIndex((i) => i - 1)}>
          Sebelumnya
        </Button>
        <span>
          {index + 1} / {snapshot.slides.length}
        </span>
        <Button disabled={index >= snapshot.slides.length - 1} onClick={() => setIndex((i) => i + 1)}>
          Berikutnya
        </Button>
      </nav>
      <footer>Gunakan tombol panah untuk berpindah slide. Versi ini mengikuti publikasi pemilik.</footer>
    </main>
  );
}
