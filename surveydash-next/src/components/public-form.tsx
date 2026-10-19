'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Check, ArrowRight, LockKeyhole, Loader2, Info } from 'lucide-react';
import type { Answer, Question } from '@/lib/types';
import { Brand } from './brand';
import { Badge, Button, EmptyState } from './ui';
import { QuestionInput } from './question-input';
import '@/app/respondent-experience.css';
export function PublicForm({
  token,
  survey,
  surveyor,
}: {
  token: string;
  surveyor?: { username: string; fullName: string };
  survey: {
    title: string;
    description: string;
    institution: string;
    status: string;
    questions: Question[];
    demo: boolean;
  };
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [closed, setClosed] = useState(survey.status === 'closed');
  const requestKey = useRef<string | null>(null);
  const required = survey.questions.filter((question) => question.required);
  const filled = required.filter((question) => {
    const value = answers[question.id];
    return Array.isArray(value)
      ? value.length > 0
      : value !== undefined && value !== null && String(value).trim() !== '';
  }).length;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    if (!requestKey.current) requestKey.current = crypto.randomUUID();
    try {
      const response = await fetch(surveyor ? `/api/referrals/${token}` : `/api/forms/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, requestKey: requestKey.current }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.error?.includes('ditutup')) setClosed(true);
        throw new Error(data.error);
      }
      setDone(true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Pengiriman gagal. Jawaban Anda masih ada di halaman ini.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="public-shell">
      <div className="public-brand">
        <Link href="/surveys">
          <Brand />
        </Link>
      </div>
      {surveyor && (
        <div className="banner" role="note" style={{ maxWidth: 720, margin: '0 auto 18px' }}>
          Surveyor: <strong>{surveyor.fullName}</strong> · @{surveyor.username}
          <p>
            Link ini mencatat sumber pengiriman jawaban secara otomatis. Nama surveyor tidak perlu Anda isi.
          </p>
        </div>
      )}
      <div className="form-preview">
        {done ? (
          <section className="card">
            <EmptyState
              icon={<Check size={27} />}
              title="Terima kasih. Jawaban Anda berarti."
              description="Respons berhasil tersimpan. Masukan Anda akan membantu meningkatkan kualitas pelayanan."
            >
              <Link href="/surveys" className="btn btn-secondary">
                Kembali ke portal responden
                <ArrowRight size={14} />
              </Link>
            </EmptyState>
          </section>
        ) : closed ? (
          <section className="card">
            <EmptyState
              icon={<LockKeyhole size={27} />}
              title="Survei sudah ditutup."
              description={`Pengumpulan jawaban untuk "${survey.title}" sudah berakhir. Terima kasih atas partisipasi Anda.`}
            >
              <Link href="/surveys" className="btn btn-secondary">
                Lihat survei lainnya
              </Link>
            </EmptyState>
          </section>
        ) : (
          <form onSubmit={submit}>
            <div className="card form-cover">
              <p className="eyebrow">{survey.institution || 'SURVEYDASH STUDIO'}</p>
              <h1>{survey.title}</h1>
              <p>{survey.description}</p>
              <div style={{ display: 'flex', gap: 7, marginTop: 17 }}>
                <Badge tone="purple">{survey.questions.length} pertanyaan</Badge>
                {survey.demo && <Badge>Form contoh / simulasi</Badge>}
              </div>
              {required.length > 0 && (
                <div className="respondent-progress">
                  <span>
                    {filled} dari {required.length} pertanyaan wajib terisi
                  </span>
                  <progress
                    max={required.length}
                    value={filled}
                    aria-label="Pertanyaan wajib yang sudah terisi"
                  />
                </div>
              )}
            </div>
            {survey.demo && (
              <div className="banner">
                <Info size={14} />
                Form ini digunakan untuk mencoba fitur. Gunakan jawaban contoh.
              </div>
            )}
            {survey.questions.map((q) => (
              <QuestionInput
                key={q.id}
                question={q}
                value={answers[q.id]}
                onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
                disabled={pending}
              />
            ))}
            {error && (
              <div className="banner banner-error" role="alert">
                {error}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 20,
              }}
            >
              <span className="hint">* Pertanyaan wajib diisi</span>
              <Button type="submit" disabled={pending} className="respondent-submit">
                {pending ? <Loader2 size={14} className="animate-spin" /> : null}Kirim jawaban
                <ArrowRight size={14} />
              </Button>
            </div>
            <p className="hint" style={{ marginTop: 18, lineHeight: 1.8 }}>
              Jawaban digunakan oleh Pengelola Survei sesuai tujuan form ini. Rekening responden hanya
              dikumpulkan jika ada pertanyaannya.{' '}
              {surveyor ? 'Sumber link Surveyor disimpan bersama jawaban. ' : ''}
              <Link href="/privacy" target="_blank" rel="noreferrer">
                Baca Kebijakan Privasi
              </Link>
              .
            </p>
          </form>
        )}
        <p className="public-footer">Dikelola melalui SurveyDash Studio</p>
      </div>
    </main>
  );
}
