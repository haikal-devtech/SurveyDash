'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { PresentationDocument } from '@/lib/presentation-model';
import { SlideThumbnail } from './slide-renderer';
import { Button } from './ui';
export function ReadonlyPresentation({ document }: { document: PresentationDocument }) {
  const [index, setIndex] = useState(0);
  return (
    <section style={{ width: '100%', minWidth: 0, padding: 20 }}>
      <Link href={`/studio/${document.surveyId}`} className="text-link">
        Kembali ke survei
      </Link>
      <h1>{document.title}</h1>
      <p>Akses pembaca · Versi {document.version}</p>
      <div style={{ marginBlock: 20 }} aria-label={`Slide ${index + 1}`}>
        <SlideThumbnail slide={document.slides[index]} />
      </div>
      <nav aria-label="Navigasi presentasi" className="actions">
        <Button variant="secondary" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>
          Sebelumnya
        </Button>
        <span aria-live="polite">
          {index + 1} / {document.slides.length}
        </span>
        <Button
          variant="secondary"
          disabled={index === document.slides.length - 1}
          onClick={() => setIndex((value) => value + 1)}
        >
          Berikutnya
        </Button>
      </nav>
    </section>
  );
}
