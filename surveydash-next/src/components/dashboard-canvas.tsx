'use client';
import { useState } from 'react';
import ReactGridLayout, { useContainerWidth, type Layout } from 'react-grid-layout';
import { Hash, Type, GripVertical, Plus, Trash2, Pencil, MousePointer2 } from 'lucide-react';
import type { Question, Survey, SurveyInsights, Widget, WidgetType } from '@/lib/types';
import { allowedWidgets } from '@/lib/model';
import { ChartComposer } from './chart-composer';
import { useChartSource } from './use-chart-source';
import type { ChartSelection } from '@/lib/chart-composer';
import { Button, Modal } from './ui';
import { DataChart } from './data-chart';

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
  const source = useChartSource(
    survey,
    widget.type === 'metric' || widget.type === 'text' ? '' : (widget.questionId ?? '__timeline'),
    insights,
  );
  if (widget.type === 'metric')
    return (
      <>
        <div className="widget-number">
          {widget.content === 'ikm' ? (stats.ikm?.toFixed(2) ?? '—') : stats.total}
        </div>
        <p className="widget-caption">{widget.content === 'ikm' ? stats.category : 'Respons terkumpul'}</p>
      </>
    );
  if (widget.type === 'text') return <p className="widget-note">{widget.content || 'Tambahkan catatan.'}</p>;
  if (source.loading)
    return (
      <p className="analysis-message" role="status">
        Memuat chart…
      </p>
    );
  if (source.error || source.unavailable)
    return <p className="analysis-message">{source.error ?? source.unavailable}</p>;
  return (
    <>
      <DataChart
        type={widget.type}
        data={source.data}
        title={widget.title}
        unit={widget.type === 'line' || widget.type === 'area' ? 'respons' : source.unit}
      />
      <p className="analysis-chart-note">{source.note}</p>
    </>
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
  const [composer, setComposer] = useState<{ initial?: ChartSelection; id?: string } | null>(null);
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
    <div className={editing ? 'dashboard-builder' : ''}>
      {editing && (
        <div className="dashboard-builder-toolbar">
          <div>
            <h3>Dashboard kamu</h3>
            <p>Tambahkan chart, lalu geser kartu untuk mengatur susunannya.</p>
          </div>
          <div className="actions">
            <Button
              variant="secondary"
              onClick={() => add(undefined, 'metric')}
              disabled={survey.widgets.length >= 50}
            >
              <Hash size={16} />
              Angka
            </Button>
            <Button
              variant="secondary"
              onClick={() => add(undefined, 'text')}
              disabled={survey.widgets.length >= 50}
            >
              <Type size={16} />
              Catatan
            </Button>
            <Button onClick={() => setComposer({})} disabled={survey.widgets.length >= 50}>
              <Plus size={16} />
              Tambah chart
            </Button>
          </div>
        </div>
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
                        <button
                          className="btn btn-ghost"

                          aria-label={`Atur ${w.title}`}
                          onClick={() =>
                            w.type === 'metric' || w.type === 'text'
                              ? setSelected({ ...w })
                              : setComposer({
                                  id: w.id,
                                  initial: {
                                    sourceId: w.questionId ?? '__timeline',
                                    type: w.type,
                                    title: w.title,
                                  },
                                })
                          }
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
              <p>
                {editing ? 'Tambahkan chart pertama ke dashboard kamu.' : 'Belum ada komponen presentasi.'}
              </p>
            </div>
          </div>
        )}
      </div>
      {composer && (
        <ChartComposer
          survey={survey}
          insights={insights}
          initial={composer.initial}
          editing={!!composer.id}
          onClose={() => setComposer(null)}
          onConfirm={(selection) => {
            const patch = {
              type: selection.type,
              title: selection.title,
              questionId: selection.sourceId === '__timeline' ? undefined : selection.sourceId,
            };
            update(
              composer.id
                ? survey.widgets.map((widget) =>
                    widget.id === composer.id ? { ...widget, ...patch } : widget,
                  )
                : [
                    ...survey.widgets,
                    {
                      id: crypto.randomUUID(),
                      ...patch,
                      x: 0,
                      y: Math.max(0, ...survey.widgets.map((w) => w.y + w.h)),
                      w: 6,
                      h: 9,
                    },
                  ],
            );
            setComposer(null);
          }}
        />
      )}
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
