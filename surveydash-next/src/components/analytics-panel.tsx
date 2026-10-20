'use client';
import { useState } from 'react';
import {
  Users,
  Target,
  Gauge,
  ListChecks,
  RefreshCw,
  BarChart3,
  SlidersHorizontal,
  Presentation,
  Pencil,
  Plus,
  EyeOff,
} from 'lucide-react';
import type { Question, Survey, SurveyInsights } from '@/lib/types';
import { chartCatalog, type CategoryChartType, type DataChartType } from '@/lib/chart-types';
import { DataChart } from './data-chart';
import { Badge, Button, Modal } from './ui';
import { useChartSource } from './use-chart-source';
import { ChartComposer } from './chart-composer';
import { defaultChartType } from '@/lib/chart-composer';

function QuestionChart({
  question,
  survey,
  insights,
  onPatch,
}: {
  question: Question;
  survey: Survey;
  insights: SurveyInsights;
  onPatch: (patch: Partial<Question>) => void;
}) {
  const [composer, setComposer] = useState(false);
  const source = useChartSource(survey, question.id, insights);
  const type = question.chartType ?? defaultChartType(question);
  return (
    <section className="analysis-question card">
      <header className="analysis-chart-header">
        <div>
          <h3>{question.label}</h3>
          <p>
            {source.answered.toLocaleString('id-ID')} dari {insights.stats.total.toLocaleString('id-ID')}{' '}
            responden menjawab
          </p>
        </div>
        <div className="chart-card-actions">
          <Button
            variant="ghost"
            onClick={() => setComposer(true)}
            aria-label={'Ubah chart ' + question.label}
          >
            <Pencil size={16} />
          </Button>
          <Button
            variant="ghost"
            aria-label={'Sembunyikan chart ' + question.label}
            onClick={() => onPatch({ chartVisible: false })}
          >
            <EyeOff size={16} />
          </Button>
        </div>
      </header>
      {source.loading ? (
        <p className="analysis-message" role="status">
          Memuat chart…
        </p>
      ) : source.error || source.unavailable ? (
        <p className="analysis-message" role="status">
          {source.error ?? source.unavailable}
        </p>
      ) : (
        <DataChart type={type} data={source.data} title={question.label} unit={source.unit} />
      )}
      <footer className="chart-card-footer">
        <span>{chartCatalog[type].label}</span>
        <p>{source.note}</p>
      </footer>
      {composer && (
        <ChartComposer
          survey={survey}
          insights={insights}
          initial={{ sourceId: question.id, type, title: question.label }}
          fixedSource
          editing
          onClose={() => setComposer(false)}
          onConfirm={(selection) => {
            onPatch({ chartType: selection.type as CategoryChartType });
            setComposer(false);
          }}
        />
      )}
    </section>
  );
}
export function AnalyticsPanel({
  survey,
  insights,
  onChange,
  onRefresh,
  onGenerate,
}: {
  survey: Survey;
  insights: SurveyInsights;
  onChange: (survey: Survey) => void;
  onRefresh: () => void;
  onGenerate: () => void;
}) {
  const [manage, setManage] = useState(false);
  const [addChart, setAddChart] = useState(false);
  const [search, setSearch] = useState('');
  const [trend, setTrend] = useState<DataChartType>('area');
  const { stats } = insights;
  const visible = (q: Question) => q.chartVisible ?? q.options.length > 0;
  const displayed = survey.questions.filter(visible);
  const answered = Object.values(insights.questions).reduce((sum, question) => sum + question.answered, 0);
  const completeness =
    stats.total && survey.questions.length
      ? Math.round((answered / (stats.total * survey.questions.length)) * 100)
      : 0;
  function patch(id: string, values: Partial<Question>) {
    onChange({ ...survey, questions: survey.questions.map((q) => (q.id === id ? { ...q, ...values } : q)) });
  }
  const metrics = [
    {
      label: 'Respons terkumpul',
      value: stats.total.toLocaleString('id-ID'),
      foot: `${survey.questions.length} pertanyaan`,
      icon: Users,
    },
    {
      label: 'Capaian target',
      value: `${stats.completion}%`,
      foot: `${stats.total.toLocaleString('id-ID')} / ${survey.target.toLocaleString('id-ID')} responden`,
      icon: Target,
    },
    {
      label: 'Kelengkapan isian',
      value: `${completeness}%`,
      foot: 'Semua pertanyaan, termasuk yang opsional',
      icon: ListChecks,
    },
    {
      label: survey.kind === 'skm' ? 'Nilai IKM' : 'Chart ditampilkan',
      value: survey.kind === 'skm' ? (stats.ikm?.toFixed(2) ?? '—') : String(displayed.length),
      foot: survey.kind === 'skm' ? stats.category : `Dari ${survey.questions.length} pertanyaan`,
      icon: Gauge,
    },
  ];
  return (
    <div className="analysis-workspace">
      <div className="panel-intro">
        <div>
          <span className="analysis-kicker">HASIL SURVEI</span>
          <h2>Dashboard analisis</h2>
          <p>Ringkasan respons dan chart pilihanmu.{survey.demo ? ' Data simulasi.' : ''}</p>
        </div>
        <div className="actions">
          <Button variant="secondary" onClick={onRefresh}>
            <RefreshCw size={15} />
            Muat ulang
          </Button>
          <Button onClick={onGenerate}>
            <Presentation size={16} />
            Buat presentasi
          </Button>
        </div>
      </div>
      <div className="stats-grid analysis-metrics">
        {metrics.map((metric) => (
          <div className="stat-card" key={metric.label}>
            <div className="stat-top">
              <span>{metric.label}</span>
              <metric.icon size={17} />
            </div>
            <strong className="stat-value">{metric.value}</strong>
            <p className="stat-foot">{metric.foot}</p>
          </div>
        ))}
      </div>
      <div className="analysis-overview">
        <section className="card analysis-trend">
          <header className="analysis-chart-header">
            <div>
              <h3>Tren respons</h3>
              <p>
                {insights.timeline?.start
                  ? `${insights.timeline.start} — ${insights.timeline.end} · WIB`
                  : 'Waktu masuknya jawaban'}
              </p>
            </div>
            <div className="chart-segmented" role="group" aria-label="Tampilan tren">
              {(['area', 'line'] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={trend === value}
                  onClick={() => setTrend(value)}
                >
                  {chartCatalog[value].label}
                </button>
              ))}
            </div>
          </header>
          <DataChart
            type={trend}
            data={insights.timeline?.points ?? []}
            title="Tren respons"
            unit="respons"
          />
          <p className="analysis-chart-note">
            {(insights.timeline?.intervalDays ?? 1) > 1
              ? `Dikelompokkan per ${insights.timeline!.intervalDays} hari.`
              : 'Jumlah respons setiap hari.'}{' '}
            Hari tanpa respons tetap ditampilkan.
          </p>
        </section>
        <section className="card analysis-target">
          <span className="analysis-kicker">PENGUMPULAN DATA</span>
          <h3>Progres target</h3>
          <div className="target-number">
            {stats.completion}
            <span>%</span>
          </div>
          <progress
            value={Math.min(stats.total, survey.target)}
            max={survey.target}
            aria-label="Capaian target responden"
          />
          <p>
            <strong>{stats.total.toLocaleString('id-ID')}</strong> respons terkumpul dari target{' '}
            {survey.target.toLocaleString('id-ID')}.
          </p>
          <div className="analysis-target-foot">
            <span>{Math.max(0, survey.target - stats.total).toLocaleString('id-ID')} lagi menuju target</span>
            <Badge>
              {survey.status === 'open' ? 'Sedang dibuka' : survey.status === 'closed' ? 'Ditutup' : 'Draf'}
            </Badge>
          </div>
        </section>
      </div>
      {stats.indicators.length > 0 && (
        <section className="card analysis-indicators">
          <header className="analysis-chart-header">
            <div>
              <h3>Unsur pelayanan</h3>
              <p>Rata-rata pada skala 1–4; jawaban kosong dikecualikan.</p>
            </div>
            <Badge tone="purple">{stats.indicators.length} unsur</Badge>
          </header>
          <DataChart
            type="column"
            maxValue={4}
            decimals
            data={stats.indicators.map((item, index) => ({
              name: `U${index + 1} · ${item.label}`,
              count: item.average,
            }))}
            title="Rata-rata unsur pelayanan"
            unit="rata-rata"
          />
          <details>
            <summary>Lihat detail per unsur</summary>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Unsur</th>
                    <th>Terisi</th>
                    <th>Kosong</th>
                    <th>Rata-rata</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.indicators.map((item) => (
                    <tr key={item.id}>
                      <td>{item.label}</td>
                      <td>{item.answered}</td>
                      <td>{item.missing}</td>
                      <td>{item.average.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}
      <div className="analysis-section-heading">
        <div>
          <h2>
            Chart per pertanyaan <span>{displayed.length}</span>
          </h2>
          <p>Pilih pertanyaan yang ingin kamu lihat di dashboard.</p>
        </div>
        <div className="actions">
          <Button variant="secondary" onClick={() => setManage(true)}>
            <SlidersHorizontal size={16} />
            Atur chart
          </Button>
          <Button onClick={() => setAddChart(true)}>
            <Plus size={16} />
            Tambah chart
          </Button>
        </div>
      </div>
      {displayed.length ? (
        <div className="analysis-chart-grid">
          {survey.questions.map((question) =>
            visible(question) ? (
              <QuestionChart
                key={question.id}
                question={question}
                survey={survey}
                insights={insights}
                onPatch={(values) => patch(question.id, values)}
              />
            ) : null,
          )}
        </div>
      ) : (
        <section className="card analysis-no-charts">
          <BarChart3 size={32} />
          <h3>Pilih chart pertamamu</h3>
          <p>Klik Atur chart, lalu aktifkan pertanyaan yang ingin ditampilkan.</p>
          <Button onClick={() => setManage(true)}>Atur chart</Button>
        </section>
      )}
      {addChart && (
        <ChartComposer
          editableTitle={false}
          survey={survey}
          insights={insights}
          onClose={() => setAddChart(false)}
          onConfirm={(selection) => {
            if (selection.sourceId === '__timeline') setTrend(selection.type);
            else
              patch(selection.sourceId, {
                chartVisible: true,
                chartType: selection.type as CategoryChartType,
              });
            setAddChart(false);
          }}
        />
      )}
      <Modal
        open={manage}
        onOpenChange={setManage}
        title="Tampilkan chart"
        description="Aktifkan pertanyaan yang ingin dilihat. Jawaban aslinya tetap tersimpan."
      >
        <label className="field">
          Cari pertanyaan
          <input
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ketik judul pertanyaan…"
          />
        </label>
        <div className="chart-question-list">
          {survey.questions
            .filter((q) => q.label.toLocaleLowerCase('id').includes(search.toLocaleLowerCase('id')))
            .map((q) => (
              <label key={q.id} className="chart-question-toggle">
                <input
                  type="checkbox"
                  checked={visible(q)}
                  onChange={(event) => patch(q.id, { chartVisible: event.target.checked })}
                />
                <span>
                  {q.label}
                  <small>
                    {q.options.length
                      ? 'Pilihan jawaban'
                      : q.type === 'number'
                        ? 'Kelompok angka'
                        : 'Distribusi teks · hanya di ruang kerja'}
                  </small>
                </span>
              </label>
            ))}
        </div>
        <p className="hint">Teks panjang atau jawaban yang terlalu beragam tetap dilihat di tab Data.</p>
        <div className="modal-footer">
          <Button onClick={() => setManage(false)}>Selesai</Button>
        </div>
      </Modal>
    </div>
  );
}
