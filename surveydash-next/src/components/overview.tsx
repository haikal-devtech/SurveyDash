'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  Plus,
  ArrowUpRight,
  Users,
  Files,
  CircleCheck,
  PanelsTopLeft,
  ClipboardList,
  MoreHorizontal,
  ArrowRight,
  Check,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Submission, Survey } from '@/lib/types';
import { CreateSurvey, type SavedTemplate } from './create-survey';
import { Badge, Button } from './ui';

export function Overview({
  surveys,
  templates,
  submissions,
  name,
}: {
  surveys: Survey[];
  templates: SavedTemplate[];
  submissions: Submission[];
  name: string;
}) {
  const [create, setCreate] = useState(false);
  const [filter, setFilter] = useState('all');
  const active = surveys.filter((s) => s.status === 'open').length;
  const chart = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const key = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    return {
      day: date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' }),
      responses: submissions.filter(
        (r) => new Date(r.submittedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) === key,
      ).length,
    };
  });
  const filtered = surveys.filter((s) => filter === 'all' || s.status === filter);
  const metrics = [
    {
      label: 'Total survei',
      value: surveys.length,
      icon: <Files size={15} />,
      foot: 'Seluruh survei di workspace',
    },
    {
      label: 'Total responden',
      value: submissions.length,
      icon: <Users size={15} />,
      foot: 'Jawaban tersimpan di database',
    },
    {
      label: 'Survei aktif',
      value: active,
      icon: <CircleCheck size={15} />,
      foot: 'Sedang menerima jawaban',
    },
    {
      label: 'Template tersedia',
      value: 3 + templates.length,
      icon: <PanelsTopLeft size={15} />,
      foot: 'Siap untuk survei berikutnya',
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Ruang kerja survei Anda<span style={{ color: '#b5a0d3' }}>.</span>
          </h1>
          <p>Halo, {name.split(' ')[0]}. Setiap jawaban membawa pemahaman baru.</p>
        </div>
        <div className="actions">
          <Button onClick={() => setCreate(true)}>
            <Plus size={15} />
            Buat survei
          </Button>
        </div>
      </div>
      <div className="stats-grid">
        {metrics.map((m, i) => (
          <div className="stat-card" key={m.label}>
            <div className="stat-top">
              <span>{m.label}</span>
              <span className="stat-icon">{m.icon}</span>
            </div>
            <div className="stat-value">{m.value.toLocaleString('id-ID')}</div>
            <div className="stat-foot">
              <em>
                <ArrowUpRight size={11} />
              </em>
              {m.foot}
            </div>
            <svg className="sparkline" width="57" height="25" viewBox="0 0 57 25">
              <path
                d={
                  i % 2
                    ? 'M1 23 L9 15 L18 18 L29 10 L39 12 L49 3 L56 6'
                    : 'M1 20 L9 21 L18 12 L28 14 L39 5 L48 8 L56 2'
                }
                fill="none"
                stroke="#b99ae8"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Aktivitas respons</h2>
              <p>Jawaban masuk dalam 14 hari terakhir · WIB</p>
            </div>
            <div className="chart-legend">
              <span>
                <i className="legend-dot" />
                Respons
              </span>
              {surveys.some((s) => s.demo) && <Badge>Termasuk simulasi</Badge>}
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 8, right: 12, left: -27, bottom: 0 }}>
                <defs>
                  <linearGradient id="response-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b193e1" stopOpacity={0.19} />
                    <stop offset="100%" stopColor="#b193e1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f0edf5" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 9, fill: '#b3a6bd' }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 9, fill: '#b3a6bd' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e9e0f4', fontSize: 11 }} />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="responses"
                  name="Respons"
                  stroke="#ae8ddc"
                  strokeWidth={2}
                  fill="url(#response-fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Workspace Anda</h2>
              <p>Seluruh proses, saling terhubung.</p>
            </div>
            <MoreHorizontal size={17} color="#b9a9c5" />
          </div>
          {[
            {
              title: 'Buat pertanyaan tanpa menulis kode',
              body: 'Mulai dari template atau susun sendiri.',
              icon: <ClipboardList size={13} />,
            },
            {
              title: 'Respons langsung menjadi tabel',
              body: 'Kelola dan koreksi data di satu tempat.',
              icon: <Check size={13} />,
            },
            {
              title: 'Presentasikan cerita di balik data',
              body: 'Susun grafik dengan drag-and-drop.',
              icon: <PanelsTopLeft size={13} />,
            },
          ].map((item) => (
            <div className="activity-item" key={item.title}>
              <div className="activity-icon">{item.icon}</div>
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
      <section id="surveys">
        <div className="section-heading">
          <h2>
            Survei Anda{' '}
            <span style={{ color: '#b9acc5', fontSize: 12, marginLeft: 5 }}>{surveys.length}</span>
          </h2>
          <div className="tabs-filter">
            {[
              ['all', 'Semua'],
              ['open', 'Aktif'],
              ['draft', 'Draft'],
              ['closed', 'Ditutup'],
            ].map(([key, label]) => (
              <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="survey-grid">
          {filtered.map((s) => (
            <Link href={`/studio/${s.id}`} className="survey-card" key={s.id}>
              <div className="survey-card-top">
                <div className="survey-icon">
                  <ClipboardList size={19} />
                </div>
                <Badge tone={s.status === 'open' ? 'green' : s.status === 'draft' ? 'amber' : 'neutral'}>
                  {s.status === 'open' ? '● Aktif' : s.status === 'draft' ? 'Draft' : 'Ditutup'}
                </Badge>
              </div>
              <h3>{s.title}</h3>
              <p className="institution">
                {s.institution || 'Instansi belum diatur'}
                {s.demo ? ' · Contoh survei' : ''}
              </p>
              <div className="survey-meta">
                <span>
                  <Users size={12} />
                  {s.responseCount ?? 0} responden
                </span>
                <span>
                  <Files size={11} />
                  {s.questions.length} pertanyaan
                </span>
              </div>
              <div className="progress">
                <span style={{ width: `${Math.min(100, ((s.responseCount ?? 0) / s.target) * 100)}%` }} />
              </div>
              <div className="survey-footer">
                <span>Target {s.target} responden</span>
                <ArrowRight size={12} />
              </div>
            </Link>
          ))}
          <button className="create-card" onClick={() => setCreate(true)}>
            <span className="plus">
              <Plus size={18} />
            </span>
            <strong>Buat survei baru</strong>
            <p>Mulai pertanyaan berikutnya.</p>
          </button>
        </div>
      </section>
      <div className="workspace-footer">
        <span>
          <Sparkles size={10} style={{ display: 'inline', marginRight: 5 }} />
          SurveyDash Studio · Semua proses dalam satu ruang
        </span>
        <span>
          <CalendarDays size={10} style={{ display: 'inline', marginRight: 5 }} />
          Contoh data untuk eksplorasi fitur
        </span>
      </div>
      <CreateSurvey open={create} onOpenChange={setCreate} templates={templates} />
    </>
  );
}
