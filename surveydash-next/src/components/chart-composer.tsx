'use client';
import { useRef, useState } from 'react';
import {
  Activity,
  AlignLeft,
  AreaChart,
  BarChart3,
  Check,
  Circle,
  CircleDot,
  Columns3,
  LineChart,
  Loader2,
  Search,
  Table2,
} from 'lucide-react';
import type { Survey, SurveyInsights } from '@/lib/types';
import { chartCatalog, type DataChartType } from '@/lib/chart-types';
import { chartSelection, chartTypesForSource, type ChartSelection } from '@/lib/chart-composer';
import { DataChart } from './data-chart';
import { useChartSource } from './use-chart-source';
import { Badge, Button, Modal } from './ui';
const icons = {
  bar: AlignLeft,
  column: BarChart3,
  donut: CircleDot,
  pie: Circle,
  stacked: Columns3,
  lollipop: Activity,
  table: Table2,
  line: LineChart,
  area: AreaChart,
};
export function ChartComposer({
  survey,
  insights,
  initial,
  onClose,
  onConfirm,
  fixedSource = false,
  editing = false,
  editableTitle = true,
}: {
  survey: Survey;
  insights?: SurveyInsights;
  initial?: ChartSelection;
  onClose: () => void;
  onConfirm: (selection: ChartSelection) => void;
  fixedSource?: boolean;
  editing?: boolean;
  editableTitle?: boolean;
}) {
  const [selection, setSelection] = useState<ChartSelection>(
    () => initial ?? chartSelection('__timeline', undefined),
  );
  const [search, setSearch] = useState('');
  const previewPanel = useRef<HTMLDivElement>(null);
  const source = useChartSource(survey, selection.sourceId, insights);
  const choices = survey.questions.filter((q) =>
    q.label.toLocaleLowerCase('id').includes(search.toLocaleLowerCase('id')),
  );
  function pick(sourceId: string) {
    setSelection(
      chartSelection(
        sourceId,
        survey.questions.find((q) => q.id === sourceId),
      ),
    );
    if (window.innerWidth <= 600)
      requestAnimationFrame(() => previewPanel.current?.scrollIntoView({ block: 'start', behavior: 'auto' }));
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={editing ? 'Ubah chart' : 'Tambahkan chart'}
      description="Pilih data, atur tampilan, lalu tambahkan."
      wide
      className="chart-composer"
    >
      <div className={'chart-composer-layout' + (fixedSource ? ' chart-composer-fixed' : '')}>
        {!fixedSource && (
          <aside className="chart-sources">
            <h3>1. Pilih data</h3>
            <label className="team-search">
              <Search size={16} />
              <input
                aria-label="Cari sumber chart"
                placeholder="Cari pertanyaan…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={200}
              />
            </label>
            <div className="chart-source-list" role="group" aria-label="Sumber chart">
              {!search && (
                <button
                  type="button"
                  className="chart-source"
                  aria-pressed={selection.sourceId === '__timeline'}
                  onClick={() => pick('__timeline')}
                >
                  <Activity size={18} />
                  <span>
                    <strong>Tren respons</strong>
                    <small>Waktu masuknya jawaban</small>
                  </span>
                  {selection.sourceId === '__timeline' && <Check size={16} />}
                </button>
              )}
              {choices.map((q) => (
                <button
                  className="chart-source"
                  type="button"
                  key={q.id}
                  aria-pressed={selection.sourceId === q.id}
                  onClick={() => pick(q.id)}
                >
                  <span className="chart-source-number">{survey.questions.indexOf(q) + 1}</span>
                  <span>
                    <strong>{q.label}</strong>
                    <small>
                      {q.options.length
                        ? 'Pilihan jawaban'
                        : q.type === 'number'
                          ? 'Distribusi angka'
                          : 'Distribusi teks'}
                    </small>
                  </span>
                  {selection.sourceId === q.id && <Check size={16} />}
                </button>
              ))}
              {!choices.length && search && <p className="chart-source-empty">Pertanyaan tidak ditemukan.</p>}
            </div>
          </aside>
        )}
        <div className="chart-composer-main" ref={previewPanel}>
          <section className="chart-style-section">
            <h3>{fixedSource ? 'Pilih tampilan' : '2. Pilih tampilan'}</h3>
            <div className="chart-style-options" role="group" aria-label="Tampilan chart">
              {chartTypesForSource(selection.sourceId).map((type) => {
                const Icon = icons[type];
                return (
                  <button
                    type="button"
                    key={type}
                    aria-pressed={selection.type === type}
                    onClick={() => setSelection({ ...selection, type: type as DataChartType })}
                    title={chartCatalog[type].description}
                  >
                    <Icon size={18} />
                    <span>{chartCatalog[type].label}</span>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="chart-live-preview" aria-label="Preview chart dari jawaban tersimpan">
            <header className="analysis-chart-header">
              <div>
                <h3>{selection.title}</h3>
                <p>
                  {source.loading
                    ? 'Memuat data…'
                    : `${source.answered.toLocaleString('id-ID')} ${selection.sourceId === '__timeline' ? 'respons' : 'responden menjawab'}`}
                </p>
              </div>
              <Badge>{chartCatalog[selection.type].label}</Badge>
            </header>
            {source.error ? (
              <div className="chart-preview-message" role="alert">
                {source.error}
              </div>
            ) : source.loading ? (
              <div className="chart-preview-message" role="status">
                <Loader2 size={22} className="animate-spin" />
                Memuat preview…
              </div>
            ) : source.unavailable ? (
              <div className="chart-preview-message">
                <Table2 size={28} />
                <p>{source.unavailable}</p>
              </div>
            ) : (
              <DataChart
                type={selection.type}
                data={source.data}
                title={selection.title}
                unit={selection.sourceId === '__timeline' ? 'respons' : source.unit}
              />
            )}
            <p className="analysis-chart-note">{source.note}</p>
          </section>
          <div className="chart-composer-settings">
            {!fixedSource && editableTitle && (
              <label htmlFor="chart-composer-title">
                Judul chart
                <input
                  className="input"
                  id="chart-composer-title"
                  value={selection.title}
                  onChange={(e) => setSelection({ ...selection, title: e.target.value })}
                  maxLength={300}
                />
              </label>
            )}
            {source.question && !source.question.options.length && (
              <p className="hint">Chart ini hanya tersedia di ruang kerja pribadi.</p>
            )}
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button
          disabled={source.loading || !!source.error || !!source.unavailable || !selection.title.trim()}
          onClick={() => onConfirm(selection)}
        >
          <Check size={16} />
          {editing ? 'Simpan tampilan' : 'Tambahkan chart'}
        </Button>
      </div>
    </Modal>
  );
}
