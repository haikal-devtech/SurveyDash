'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Check, ArrowLeft, ArrowRight, LockKeyhole, Loader2, Info, UserRound } from 'lucide-react';
import type { Answer, Question } from '@/lib/types';
import { respondentProgress } from '@/lib/respondent-progress';
import { Brand } from './brand';
import { Badge, Button } from './ui';
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
  const [attempted, setAttempted] = useState(false);
  const requestKey = useRef<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const stateHeading = useRef<HTMLHeadingElement>(null);
  const progress = respondentProgress(survey.questions, answers);

  useEffect(() => {
    if (done || closed) stateHeading.current?.focus();
  }, [done, closed]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (progress.missing.length) {
      setError('Lengkapi pertanyaan wajib yang belum diisi.');
      const question = [...(form.current?.querySelectorAll<HTMLElement>('[data-question-id]') ?? [])].find(
        (element) => element.dataset.questionId === progress.missing[0],
      );
      question?.querySelector<HTMLElement>('input, textarea, select')?.focus();
      question?.scrollIntoView({ block: 'center', behavior: 'auto' });
      return;
    }
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
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Pengiriman gagal. Coba kirim kembali.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="public-shell respondent-form-page">
      <div className="respondent-layout">
        <header className="respondent-header">
          <Link href="/surveys" aria-label="Portal responden SurveyDash">
            <Brand />
          </Link>
          <Link href="/surveys" className="respondent-back">
            <ArrowLeft size={16} aria-hidden="true" />
            Daftar survei
          </Link>
        </header>
        {done || closed ? (
          <section className={`respondent-state ${done ? 'respondent-state-success' : ''}`}>
            <div className="respondent-state-icon" aria-hidden="true">
              {done ? <Check size={32} /> : <LockKeyhole size={30} />}
            </div>
            <h1 ref={stateHeading} tabIndex={-1}>
              {done ? 'Jawaban berhasil dikirim.' : 'Survei sudah ditutup.'}
            </h1>
            <p>
              {done
                ? 'Terima kasih sudah meluangkan waktu untuk mengisi survei ini.'
                : `Pengumpulan jawaban untuk “${survey.title}” sudah berakhir.`}
            </p>
            <Link href="/surveys" className="btn btn-secondary">
              Kembali ke daftar survei
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <form ref={form} onSubmit={submit} aria-busy={pending}>
            <section className="card form-cover">
              <p className="respondent-institution">{survey.institution || 'SurveyDash Studio'}</p>
              <h1>{survey.title}</h1>
              {survey.description && <p className="respondent-form-description">{survey.description}</p>}
              <div className="respondent-form-meta">
                <span>{survey.questions.length} pertanyaan</span>
                <span>Tanpa login</span>
                {survey.demo && <Badge>Form contoh / simulasi</Badge>}
              </div>
              {surveyor && (
                <aside className="respondent-surveyor" role="note">
                  <UserRound size={20} aria-hidden="true" />
                  <div>
                    <p>
                      Surveyor: <strong>{surveyor.fullName}</strong> <span>@{surveyor.username}</span>
                    </p>
                    <small>Jawaban dari link ini otomatis tercatat untuk Surveyor tersebut.</small>
                  </div>
                </aside>
              )}
            </section>
            {progress.total > 0 && (
              <div className="respondent-progress">
                <div>
                  <span>
                    {progress.answered} dari {progress.total} pertanyaan terisi
                  </span>
                  <small>
                    {progress.required
                      ? progress.remainingRequired
                        ? `${progress.remainingRequired} wajib belum diisi`
                        : 'Semua pertanyaan wajib terisi'
                      : 'Semua pertanyaan opsional'}
                  </small>
                </div>
                <progress
                  max={progress.total}
                  value={progress.answered}
                  aria-label="Pertanyaan yang sudah terisi"
                />
                <div className="respondent-progress-track" aria-hidden="true">
                  <span style={{ transform: `scaleX(${progress.answered / progress.total})` }} />
                </div>
              </div>
            )}
            {survey.demo && (
              <div className="respondent-demo-note">
                <Info size={18} aria-hidden="true" />
                <p>Ini form simulasi. Gunakan jawaban contoh untuk mencoba fitur.</p>
              </div>
            )}
            <div className="respondent-questions">
              {survey.questions.map((question, index) => (
                <QuestionInput
                  key={question.id}
                  question={question}
                  number={index + 1}
                  invalid={attempted && progress.missing.includes(question.id)}
                  value={answers[question.id]}
                  onChange={(value) => setAnswers((previous) => ({ ...previous, [question.id]: value }))}
                  disabled={pending}
                />
              ))}
            </div>
            {error && (
              <div className="banner banner-error respondent-form-error" role="alert">
                <strong>{error}</strong>
                <p>Jawaban Anda tetap ada di halaman ini.</p>
              </div>
            )}
            <div className="respondent-form-actions">
              <p>
                <span aria-hidden="true">*</span> Pertanyaan wajib diisi
              </p>
              <Button type="submit" disabled={pending} className="respondent-submit">
                {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
                {pending ? 'Sedang mengirim…' : 'Kirim jawaban'}
                {!pending && <ArrowRight size={18} aria-hidden="true" />}
              </Button>
            </div>
            <p className="respondent-privacy-note">
              Jawaban diterima oleh Pengelola Survei sesuai tujuan form ini.{' '}
              <Link href="/privacy" target="_blank" rel="noreferrer">
                Baca Kebijakan Privasi
              </Link>
              .
            </p>
          </form>
        )}
        <footer className="respondent-footer">
          <span>SurveyDash Studio</span>
          <Link href="/contact">Butuh bantuan?</Link>
        </footer>
      </div>
    </main>
  );
}
