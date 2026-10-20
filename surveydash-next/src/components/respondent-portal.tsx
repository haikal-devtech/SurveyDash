'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ClipboardList, Search, Link2 } from 'lucide-react';
import { Brand } from './brand';
import '@/app/respondent-experience.css';

interface PublicSurvey {
  token: string;
  title: string;
  description: string;
  institution: string;
  status: string;
  demo: boolean;
}

export function RespondentPortal({ surveys }: { surveys: PublicSurvey[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('open');
  const filtered = surveys.filter(
    (survey) =>
      (status === 'open' ? survey.status === 'open' : survey.status === 'closed') &&
      `${survey.title} ${survey.institution} ${survey.description}`
        .toLocaleLowerCase('id-ID')
        .includes(query.trim().toLocaleLowerCase('id-ID')),
  );
  return (
    <main className="public-shell respondent-portal">
      <div className="respondent-directory">
        <header className="respondent-header">
          <Link href="/" aria-label="Beranda SurveyDash">
            <Brand />
          </Link>
          <Link href="/contact" className="respondent-help">
            Butuh bantuan?
          </Link>
        </header>
        <section className="respondent-directory-heading" aria-labelledby="respondent-directory-title">
          <h1 id="respondent-directory-title">Survei untuk Anda.</h1>
          <p>Pilih survei dan bagikan pengalaman Anda. Tidak perlu login.</p>
        </section>
        <div className="respondent-directory-tools">
          <div className="respondent-search" role="search">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari judul atau instansi"
              aria-label="Cari survei"
              maxLength={200}
            />
          </div>
          <div className="respondent-status-tabs" aria-label="Status survei">
            {[
              ['open', 'Bisa diisi'],
              ['closed', 'Ditutup'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="respondent-directory-count" role="status">
          {filtered.length.toLocaleString('id-ID')} survei
          {query.trim() ? ' ditemukan' : status === 'open' ? ' bisa diisi' : ' ditutup'}
        </div>
        {filtered.length ? (
          <ul className="respondent-survey-list">
            {filtered.map((survey) => (
              <li key={survey.token}>
                <Link href={`/f/${survey.token}`} className="respondent-survey-link">
                  <span className="respondent-survey-icon" aria-hidden="true">
                    <ClipboardList size={24} strokeWidth={1.6} />
                  </span>
                  <div className="respondent-survey-copy">
                    {survey.institution && <p className="respondent-institution">{survey.institution}</p>}
                    <h2>{survey.title}</h2>
                    {survey.description && (
                      <p className="respondent-survey-description">{survey.description}</p>
                    )}
                    <div className="respondent-survey-meta">
                      <span className={survey.status === 'open' ? 'respondent-open' : ''}>
                        {survey.status === 'open' ? 'Menerima jawaban' : 'Pengisian ditutup'}
                      </span>
                      {survey.demo && <span>Survei contoh / simulasi</span>}
                    </div>
                  </div>
                  <span className="respondent-survey-action">
                    {survey.status === 'open' ? 'Isi survei' : 'Lihat status'}
                    <ArrowRight size={18} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <section className="respondent-directory-empty">
            <ClipboardList size={32} strokeWidth={1.4} aria-hidden="true" />
            <h2>
              {query.trim()
                ? 'Survei tidak ditemukan'
                : status === 'open'
                  ? 'Belum ada survei yang dibuka'
                  : 'Belum ada survei yang ditutup'}
            </h2>
            <p>
              {query.trim()
                ? 'Coba judul atau nama instansi lainnya.'
                : 'Jika Anda menerima link survei, buka langsung link tersebut.'}
            </p>
            {query && (
              <button type="button" className="btn btn-secondary" onClick={() => setQuery('')}>
                Hapus pencarian
              </button>
            )}
          </section>
        )}
        <aside className="respondent-direct-link-note">
          <Link2 size={20} aria-hidden="true" />
          <p>Punya link dari Surveyor? Buka link tersebut agar jawaban tercatat untuk Surveyor Anda.</p>
        </aside>
        <footer className="respondent-footer">
          <span>SurveyDash Studio</span>
          <nav aria-label="Bantuan responden">
            <Link href="/privacy">Privasi</Link>
            <Link href="/contact">Kontak</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
