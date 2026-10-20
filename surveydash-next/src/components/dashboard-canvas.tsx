'use client';
import { useState } from 'react';
import ReactGridLayout, { useContainerWidth, type Layout } from 'react-grid-layout';
import { Hash, Type, GripVertical, Plus, Trash2, Pencil, MousePointer2 } from 'lucide-react';
import type { Question, Survey, SurveyInsights, Widget, WidgetType } from '@/lib/types';
import { allowedWidgets } from '@/lib/model';
import { Button, Modal } from './ui';
import { DataChart, ChartTypePicker } from './data-chart';
import { chartCatalog, trendChartTypes, type DataChartType } from '@/lib/chart-types';

const typeLabels: Record<WidgetType, string> = {
  ...Object.fromEntries(Object.entries(chartCatalog).map(([key, value]) => [key, value.label])),
  metric: 'Angka',
  text: 'Catatan',
} as Record<WidgetType, string>;
function WidgetView({
  widget,
  survey,
  insights,
}: {
  widget: Widget;
  survey: Survey;
  insights: SurveyInsights;
}) {
  const { stats } = insights;
  const q = survey.questions.find((q) => q.id === widget.questionId);
  const data = q ? (insights.questions[q.id]?.distribution ?? []) : [];
  if (widget.type === 'metric')
    return (
      <>
        <div className="widget-number">
          {widget.content === 'ikm' ? (stats.ikm?.toFixed(2) ?? '—') : stats.total}
        </div>
        <p className="widget-caption">
          {widget.content === 'ikm'
            ? `${stats.grade} · ${stats.category}`
            : `Dari target ${survey.target} responden`}
        </p>
      </>
    );
  if (widget.type === 'text')
    return <p className="widget-note">{widget.content || 'Tambahkan catatan untuk presentasi Anda.'}</p>;
  if (widget.type === 'line' || widget.type === 'area')
    return (
      <DataChart
        type={widget.type}
        data={insights.timeline?.points ?? []}
        title={widget.title}
        unit="respons"
      />
    );
  if (!q) return <div className="chart-empty">Pilih pertanyaan untuk komponen ini.</div>;
  if (!stats.total) return <div className="chart-empty">Grafik muncul setelah ada jawaban.</div>;
  if (widget.type === 'table')
    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        <table className="widget-table">
          {!q.options.length && (
            <caption className="hint">
              Sampel 50 jawaban terbaru; jawaban panjang disingkat. Buka Data untuk isi lengkap.
            </caption>
          )}
          <thead>
            <tr>
              <th>{q.options.length ? 'Pilihan jawaban' : 'Jawaban'}</th>
              {q.options.length > 0 && <th style={{ textAlign: 'right' }}>Jumlah</th>}
            </tr>
          </thead>
          <tbody>
            {q.options.length
              ? data.map((d) => (
                  <tr key={d.name}>
                    <td>{d.name}</td>
                    <td style={{ textAlign: 'right' }}>{d.count}</td>
                  </tr>
                ))
              : (insights.questions[q.id]?.samples ?? []).map((answer, index) => (
                  <tr key={index}>
                    <td>{answer}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <DataChart
      type={widget.type}
      data={data}
      title={widget.title}
      unit={q.type === 'checkbox' ? 'pilihan' : 'jawaban'}
    />
  );
}
export function DashboardCanvas({
  survey,
  insights,
  onChange,
  editing,
}: {
  survey: Survey;
  insights: SurveyInsights;
  onChange?: (s: Survey) => void;
  editing: boolean;
}) {
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const [selected, setSelected] = useState<Widget | null>(null);
  const narrow = width > 0 && width < 580;
  const layout: Layout = survey.widgets.map((w, i) => ({
    i: w.id,
    x: narrow ? 0 : w.x,
    y: narrow ? i * 7 : w.y,
    w: narrow ? 12 : w.w,
    h: narrow ? 7 : Math.max(4, w.h),
    minW: 3,
    minH: 4,
  }));
  function update(widgets: Widget[]) {
    onChange?.({ ...survey, widgets });
  }
  function add(q?: Question, type?: WidgetType, x = 0, y?: number) {
    const widget: Widget = {
      id: crypto.randomUUID(),
      type: type ?? (q ? allowedWidgets(q)[0] : 'metric'),
      title:
        q?.label ??
        (type === 'metric'
          ? 'Total responden'
          : type === 'line' || type === 'area'
            ? 'Tren respons'
            : 'Catatan presentasi'),
      ...(q ? { questionId: q.id } : {}),
      content: type === 'text' ? 'Tuliskan insight utama survei Anda.' : undefined,
      x,
      y: y ?? Math.max(0, ...survey.widgets.map((w) => w.y + w.h)),
      w: 6,
      h: 6,
    };
    update([...survey.widgets, widget]);
  }
  function layoutChange(next: Layout) {
    if (!editing || narrow) return;
    const widgets = survey.widgets.map((w) => {
      const item = next.find((item) => item.i === w.id);
      return item ? { ...w, x: item.x, y: item.y, w: item.w, h: item.h } : w;
    });
    if (
      widgets.some(
        (w, i) =>
          w.x !== survey.widgets[i].x ||
          w.y !== survey.widgets[i].y ||
          w.w !== survey.widgets[i].w ||
          w.h !== survey.widgets[i].h,
      )
    )
      update(widgets);
  }
  return (
    <div className={editing ? 'canvas-layout' : ''}>
      {editing && (
        <aside className="card builder-palette">
          <h3>Data & komponen</h3>
          <p className="hint" style={{ marginBottom: 14 }}>
            Seret ke kanvas atau klik + untuk menambahkan.
          </p>
          <div className="palette-list" style={{ display: 'block' }}>
            {survey.questions.map((q) => (
              <div
                key={q.id}
                className="palette-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', q.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                style={{ cursor: 'grab', fontSize: 10 }}
              >
                <GripVertical size={12} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{q.label}</span>
                <button
                  className="btn btn-ghost"
                  style={{ padding: 2, minHeight: 22 }}
                  aria-label={`Tambahkan ${q.label} ke presentasi`}
                  onClick={() => add(q)}
                >
                  <Plus size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="dashboard-trend-add">
            {trendChartTypes.map((type) => (
              <button type="button" key={type} className="palette-item" onClick={() => add(undefined, type)}>
                Tren · {chartCatalog[type].label}
                <Plus size={14} />
              </button>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #ede5f5', paddingTop: 13, marginTop: 15 }}>
            <button className="palette-item" onClick={() => add(undefined, 'metric')}>
              <Hash size={14} />
              Kartu angka
              <Plus size={12} style={{ marginLeft: 'auto' }} />
            </button>
            <button className="palette-item" onClick={() => add(undefined, 'text')}>
              <Type size={14} />
              Catatan
              <Plus size={12} style={{ marginLeft: 'auto' }} />
            </button>
          </div>
        </aside>
      )}
      <div className="canvas" ref={containerRef}>
        {mounted && (
          <ReactGridLayout
            width={width}
            layout={layout}
            gridConfig={{ cols: 12, rowHeight: 32, margin: [15, 15], containerPadding: [0, 0] }}
            dragConfig={{
              enabled: editing && !narrow,
              handle: '.widget-handle',
              cancel: 'button,input,select,textarea',
            }}
            resizeConfig={{ enabled: editing && !narrow, handles: ['se'] }}
            dropConfig={{ enabled: editing && !narrow, defaultItem: { w: 6, h: 6 } }}
            onLayoutChange={layoutChange}
            onDrop={(_next, item, event) => {
              if (!editing || !item) return;
              const id = (event as DragEvent).dataTransfer?.getData('text/plain');
              const q = survey.questions.find((q) => q.id === id);
              if (q) add(q, undefined, Math.min(item.x, 6), item.y);
            }}
            style={{ minHeight: survey.widgets.length ? undefined : 360 }}
          >
            {survey.widgets.map((w) => (
              <div key={w.id}>
                <section className="widget">
                  <div className={`widget-head ${editing ? 'widget-handle' : ''}`}>
                    {editing && <GripVertical size={12} color="#c3afd2" />}
                    <strong>{w.title}</strong>
                    {editing && (
                      <>
                        <select
                          aria-label={`Jenis tampilan ${w.title}`}
                          value={w.type}
                          onChange={(e) =>
                            update(
                              survey.widgets.map((p) =>
                                p.id === w.id ? { ...p, type: e.target.value as WidgetType } : p,
                              ),
                            )
                          }
                        >
                          {(w.questionId
                            ? allowedWidgets(survey.questions.find((q) => q.id === w.questionId)!)
                            : w.type === 'line' || w.type === 'area'
                              ? [...trendChartTypes]
                              : [w.type]
                          ).map((type) => (
                            <option key={type} value={type}>
                              {typeLabels[type]}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: 2, minHeight: 22 }}
                          aria-label={`Atur ${w.title}`}
                          onClick={() => setSelected({ ...w })}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: 2, minHeight: 22 }}
                          aria-label={`Hapus komponen ${w.title}`}
                          onClick={() => update(survey.widgets.filter((p) => p.id !== w.id))}
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="widget-body">
                    <WidgetView widget={w} survey={survey} insights={insights} />
                  </div>
                </section>
              </div>
            ))}
          </ReactGridLayout>
        )}
        {!survey.widgets.length && (
          <div className="chart-empty" style={{ marginTop: editing ? -220 : 0, pointerEvents: 'none' }}>
            <div>
              <MousePointer2 size={27} style={{ margin: '0 auto 12px' }} />
              <p>{editing ? 'Tarik pertanyaan pertama ke sini.' : 'Belum ada komponen presentasi.'}</p>
            </div>
          </div>
        )}
      </div>
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Atur komponen presentasi"
      >
        {selected && (
          <>
            <div className="field">
              <label htmlFor="widget-title">Judul</label>
              <input
                id="widget-title"
                className="input"
                value={selected.title}
                onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                maxLength={300}
              />
            </div>
            {selected.type !== 'metric' &&
              selected.type !== 'text' &&
              (selected.questionId
                ? !!survey.questions.find((q) => q.id === selected.questionId)?.options.length
                : true) && (
                <ChartTypePicker
                  compact
                  value={selected.type as DataChartType}
                  trend={selected.type === 'line' || selected.type === 'area'}
                  onChange={(type) => setSelected({ ...selected, type })}
                />
              )}
            {selected.type === 'text' && (
              <div className="field">
                <label htmlFor="widget-note">Isi catatan</label>
                <textarea
                  id="widget-note"
                  className="input"
                  value={selected.content ?? ''}
                  onChange={(e) => setSelected({ ...selected, content: e.target.value })}
                  maxLength={3000}
                />
              </div>
            )}
            {selected.type === 'metric' && (
              <div className="field">
                <label htmlFor="widget-metric">Angka yang ditampilkan</label>
                <select
                  id="widget-metric"
                  className="input"
                  value={selected.content ?? 'total'}
                  onChange={(e) => setSelected({ ...selected, content: e.target.value })}
                >
                  <option value="total">Total responden</option>
                  {survey.kind === 'skm' && <option value="ikm">Nilai IKM</option>}
                </select>
              </div>
            )}
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  update(survey.widgets.map((w) => (w.id === selected.id ? selected : w)));
                  setSelected(null);
                }}
              >
                Terapkan
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
