'use client';
import { Users, Target, Gauge, CircleCheck, RefreshCw, BarChart3, WandSparkles } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Survey, SurveyInsights } from '@/lib/types';
import { Badge, Button, EmptyState } from './ui';
const colors = ['#b79bdc', '#8f73b4', '#c9b6e3', '#92bcb0', '#dbc58f', '#b1bbd7', '#d3a5b6'];
export function AnalyticsPanel({
  survey,
  insights,
  onRefresh,
  onGenerate,
}: {
  survey: Survey;
  insights: SurveyInsights;
  onRefresh: () => void;
  onGenerate: () => void;
}) {
  const { stats } = insights;
  const profile =
    survey.questions.find((q) => q.id === 'gender') ?? survey.questions.find((q) => q.type === 'choice');
  const profileData = profile ? (insights.questions[profile.id]?.distribution ?? []) : [];
  const scored = stats.indicators.length > 0;
  const bars = scored
    ? stats.indicators.map((i, index) => ({
        name: `U${index + 1}`,
        fullName: i.label,
        value: Number(i.average.toFixed(2)),
      }))
    : survey.questions
        .filter((q) => q.options.length > 0)
        .map((q) => ({
          name: q.label.length > 16 ? q.label.slice(0, 16) + '…' : q.label,
          fullName: q.label,
          value: insights.questions[q.id]?.answered ?? 0,
        }));
  const metrics = [
    {
      label: 'Total responden',
      value: String(stats.total),
      foot: `Target ${survey.target} responden`,
      icon: Users,
    },
    {
      label: survey.kind === 'skm' ? 'Nilai IKM' : 'Pertanyaan',
      value: stats.ikm?.toFixed(2) ?? (survey.kind === 'skm' ? '—' : String(survey.questions.length)),
      foot: survey.kind === 'skm' ? stats.category : 'Pertanyaan dalam form',
      icon: Gauge,
    },
    {
      label: survey.kind === 'skm' ? 'Mutu pelayanan' : 'Respons valid',
      value: survey.kind === 'skm' ? stats.grade : String(stats.total),
      foot: survey.kind === 'skm' ? stats.category : 'Tervalidasi sebelum disimpan',
      icon: CircleCheck,
    },
    {
      label: 'Capaian target',
      value: `${stats.completion}%`,
      foot: `${stats.total} dari ${survey.target} responden`,
      icon: Target,
    },
  ];
  return (
    <>
      <div className="panel-intro">
        <div>
          <h2>Melihat lebih jauh dari angka.</h2>
          <p>
            Hasil dihitung dari jawaban yang tersimpan.{' '}
            {survey.demo ? 'Survei ini berisi data simulasi.' : ''}
          </p>
        </div>
        <div className="actions">
          <Button variant="secondary" onClick={onRefresh}>
            <RefreshCw size={13} />
            Muat ulang
          </Button>
          <Button onClick={onGenerate}>
            <WandSparkles size={14} />
            Buat presentasi
          </Button>
        </div>
      </div>
      <div className="stats-grid">
        {metrics.map((m) => (
          <div className="stat-card" key={m.label}>
            <div className="stat-top">
              <span>{m.label}</span>
              <span className="stat-icon">
                <m.icon size={15} />
              </span>
            </div>
            <div className="stat-value">{m.value}</div>
            <p className="stat-foot">{m.foot}</p>
          </div>
        ))}
      </div>
      {!stats.total ? (
        <section className="card">
          <EmptyState
            icon={<BarChart3 size={24} />}
            title="Insight dimulai dari jawaban pertama."
            description="Buka form dan kumpulkan respons. Grafik dan nilai akan dihitung secara otomatis."
          />
        </section>
      ) : (
        <>
          <div className="overview-grid">
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>{scored ? 'Rata-rata unsur pelayanan' : 'Respons per pertanyaan'}</h2>
                  <p>
                    {scored
                      ? 'Skala 1–4 · Jawaban kosong dikecualikan per unsur'
                      : 'Jumlah jawaban yang tersedia'}
                  </p>
                </div>
                <Badge tone="purple">{scored ? '9 unsur' : 'Distribusi'}</Badge>
              </div>
              <div style={{ height: 250, padding: '0 20px 20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} margin={{ left: -25, top: 12, right: 10, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#f0eaf7" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#b09ebf' }}
                    />
                    <YAxis
                      domain={scored ? [0, 4] : undefined}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#b09ebf' }}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e9e0f4' }}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                    />
                    <Bar
                      isAnimationActive={false}
                      dataKey="value"
                      name={scored ? 'Rata-rata' : 'Jawaban'}
                      fill="#af93d3"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={31}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>{profile?.label ?? 'Profil responden'}</h2>
                  <p>Komposisi jawaban responden</p>
                </div>
              </div>
              <div style={{ height: 167 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      isAnimationActive={false}
                      data={profileData}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={49}
                      outerRadius={70}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {profileData.map((p, i) => (
                        <Cell key={p.name} fill={colors[i % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e9e0f4' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ padding: '0 23px 22px', display: 'grid', gap: 9 }}>
                {profileData.map((p, i) => (
                  <div
                    key={p.name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 10,
                      color: '#aa95b8',
                    }}
                  >
                    <span>
                      <i className="legend-dot" style={{ background: colors[i % colors.length] }} />
                      {p.name}
                    </span>
                    <strong style={{ fontWeight: 500 }}>{p.count}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>
          {scored && (
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>Detail unsur pelayanan</h2>
                  <p>Rata-rata memakai jumlah jawaban valid pada masing-masing unsur.</p>
                </div>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Unsur pelayanan</th>
                      <th>Jawaban valid</th>
                      <th>Kosong</th>
                      <th>Rata-rata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.indicators.map((ind, i) => (
                      <tr key={ind.id}>
                        <td>{i + 1}</td>
                        <td style={{ padding: 14, minWidth: 230 }}>{ind.label}</td>
                        <td>{ind.answered}</td>
                        <td>{ind.missing}</td>
                        <td>
                          <Badge tone="purple">{ind.average.toFixed(2)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
