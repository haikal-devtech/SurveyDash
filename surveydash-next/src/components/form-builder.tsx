'use client';
import { useState } from 'react';
import {
  AlignLeft,
  List,
  ListChecks,
  Star,
  Hash,
  CalendarDays,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Plus,
  Lock,
} from 'lucide-react';
import type { Question, QuestionType, Survey } from '@/lib/types';
import { Badge, Button } from './ui';

const questionTypes: { type: QuestionType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Jawaban singkat', icon: <AlignLeft size={15} /> },
  { type: 'textarea', label: 'Paragraf', icon: <AlignLeft size={15} /> },
  { type: 'choice', label: 'Pilihan tunggal', icon: <List size={15} /> },
  { type: 'checkbox', label: 'Pilihan jamak', icon: <ListChecks size={15} /> },
  { type: 'rating', label: 'Skala penilaian', icon: <Star size={15} /> },
  { type: 'number', label: 'Angka', icon: <Hash size={15} /> },
  { type: 'date', label: 'Tanggal', icon: <CalendarDays size={15} /> },
];
export function FormBuilder({
  survey,
  hasResponses,
  onChange,
}: {
  survey: Survey;
  hasResponses: boolean;
  onChange: (survey: Survey) => void;
}) {
  const [dragged, setDragged] = useState<string | null>(null);
  function change(q: Question) {
    onChange({ ...survey, questions: survey.questions.map((p) => (p.id === q.id ? q : p)) });
  }
  function add(type: QuestionType) {
    const options = ['choice', 'checkbox', 'rating'].includes(type)
      ? Array.from({ length: type === 'rating' ? 4 : 2 }, (_, i) => ({
          id: crypto.randomUUID(),
          label:
            type === 'rating' ? ['Tidak puas', 'Kurang puas', 'Puas', 'Sangat puas'][i] : `Pilihan ${i + 1}`,
        }))
      : [];
    onChange({
      ...survey,
      questions: [
        ...survey.questions,
        {
          id: crypto.randomUUID(),
          label: 'Pertanyaan baru',
          description: '',
          type,
          required: false,
          scored: false,
          options,
        },
      ],
    });
  }
  function move(id: string, to: number) {
    const next = [...survey.questions];
    const index = next.findIndex((q) => q.id === id);
    if (index < 0 || to < 0 || to >= next.length) return;
    const [question] = next.splice(index, 1);
    next.splice(to, 0, question);
    onChange({ ...survey, questions: next });
  }
  return (
    <>
      <div className="panel-intro">
        <div>
          <h2>Pertanyaan yang membuka pemahaman.</h2>
          <p>{survey.questions.length} pertanyaan · Seret kartu untuk mengatur urutan.</p>
        </div>
        <Badge tone="purple">{survey.kind === 'skm' ? 'Template SKM · 9 unsur' : 'Survei kustom'}</Badge>
      </div>
      {hasResponses && (
        <div className="banner">
          <Lock size={14} />
          Survei sudah memiliki respons. Jenis, pilihan, dan skor pertanyaan dikunci agar data tetap
          konsisten.
        </div>
      )}
      <div className="builder-layout">
        <aside className="card builder-palette">
          <h3>Tambahkan pertanyaan</h3>
          <div className="palette-list">
            {questionTypes.map((t) => (
              <button className="palette-item" key={t.type} onClick={() => add(t.type)}>
                {t.icon}
                {t.label}
                <Plus size={12} style={{ marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 17 }}>
            Setiap pertanyaan mempunyai ID tetap, sehingga urutannya dapat diubah dengan aman.
          </p>
        </aside>
        <div>
          {survey.questions.map((q, index) => (
            <article
              className="card question-card"
              key={q.id}
              onDragOver={(e) => {
                if (dragged) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragged) move(dragged, index);
                setDragged(null);
              }}
            >
              <div className="question-card-title">
                <button
                  className="btn btn-ghost"
                  style={{ padding: 2, minHeight: 24 }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', q.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDragged(q.id);
                  }}
                  onDragEnd={() => setDragged(null)}
                  aria-label={`Seret pertanyaan ${index + 1}`}
                >
                  <GripVertical size={15} />
                </button>
                <span className="question-number">{index + 1}</span>
                <strong>{q.label || 'Pertanyaan baru'}</strong>
                <select
                  className="question-type-select"
                  aria-label={`Jenis pertanyaan ${index + 1}`}
                  value={q.type}
                  disabled={hasResponses}
                  onChange={(e) => {
                    const type = e.target.value as QuestionType;
                    change({
                      ...q,
                      type,
                      scored: false,
                      options: ['choice', 'checkbox', 'rating'].includes(type)
                        ? q.options.length >= 2
                          ? q.options.map((option) => ({ id: option.id, label: option.label }))
                          : Array.from({ length: type === 'rating' ? 4 : 2 }, (_, i) => ({
                              id: crypto.randomUUID(),
                              label: `Pilihan ${i + 1}`,
                            }))
                        : [],
                    });
                  }}
                >
                  {questionTypes.map((item) => (
                    <option key={item.type} value={item.type}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  style={{ padding: 3, minHeight: 26 }}
                  aria-label={`Naikkan pertanyaan ${index + 1}`}
                  disabled={index === 0}
                  onClick={() => move(q.id, index - 1)}
                >
                  <ArrowUp size={13} />
                </Button>
                <Button
                  variant="ghost"
                  style={{ padding: 3, minHeight: 26 }}
                  aria-label={`Turunkan pertanyaan ${index + 1}`}
                  disabled={index === survey.questions.length - 1}
                  onClick={() => move(q.id, index + 1)}
                >
                  <ArrowDown size={13} />
                </Button>
              </div>
              <div className="question-body">
                <div className="field">
                  <label htmlFor={`label-${q.id}`}>Pertanyaan</label>
                  <input
                    id={`label-${q.id}`}
                    className="input"
                    value={q.label}
                    maxLength={500}
                    onChange={(e) => change({ ...q, label: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`description-${q.id}`}>
                    Deskripsi <span style={{ fontWeight: 400, color: '#b3a1bf' }}>(opsional)</span>
                  </label>
                  <input
                    id={`description-${q.id}`}
                    className="input"
                    value={q.description}
                    maxLength={2000}
                    placeholder="Tambahkan petunjuk untuk responden"
                    onChange={(e) => change({ ...q, description: e.target.value })}
                  />
                </div>
                {q.options.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <p className="label">Pilihan jawaban {q.scored ? 'dan skor' : ''}</p>
                    {q.options.map((o, i) => (
                      <div className="option-row" key={o.id}>
                        <span className="hint" style={{ minWidth: 16 }}>
                          {i + 1}.
                        </span>
                        <input
                          className="input"
                          aria-label={`Pilihan ${i + 1} untuk ${q.label}`}
                          value={o.label}
                          maxLength={300}
                          disabled={hasResponses}
                          onChange={(e) =>
                            change({
                              ...q,
                              options: q.options.map((p) =>
                                p.id === o.id ? { ...p, label: e.target.value } : p,
                              ),
                            })
                          }
                        />
                        {q.scored && (
                          <select
                            className="input option-score"
                            aria-label={`Skor pilihan ${i + 1}`}
                            value={o.score ?? i + 1}
                            disabled={hasResponses}
                            onChange={(e) =>
                              change({
                                ...q,
                                options: q.options.map((p) =>
                                  p.id === o.id ? { ...p, score: Number(e.target.value) } : p,
                                ),
                              })
                            }
                          >
                            {[1, 2, 3, 4].map((s) => (
                              <option value={s} key={s}>
                                Skor {s}
                              </option>
                            ))}
                          </select>
                        )}
                        <Button
                          variant="ghost"
                          disabled={hasResponses || q.options.length <= 2}
                          aria-label={`Hapus pilihan ${i + 1}`}
                          style={{ padding: 4 }}
                          onClick={() => change({ ...q, options: q.options.filter((p) => p.id !== o.id) })}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      disabled={hasResponses}
                      style={{ fontSize: 10, marginTop: 8 }}
                      onClick={() =>
                        change({
                          ...q,
                          options: [
                            ...q.options,
                            {
                              id: crypto.randomUUID(),
                              label: `Pilihan ${q.options.length + 1}`,
                              ...(q.scored ? { score: 4 } : {}),
                            },
                          ],
                        })
                      }
                    >
                      <Plus size={12} />
                      Tambah pilihan
                    </Button>
                  </div>
                )}
                <div className="question-controls">
                  <label>
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => change({ ...q, required: e.target.checked })}
                    />
                    Wajib diisi
                  </label>
                  {['choice', 'rating'].includes(q.type) && (
                    <label>
                      <input
                        type="checkbox"
                        checked={q.scored}
                        disabled={hasResponses}
                        onChange={(e) =>
                          change({
                            ...q,
                            scored: e.target.checked,
                            options: q.options.map((o, i) => ({
                              ...o,
                              score: e.target.checked ? Math.min(i + 1, 4) : undefined,
                            })),
                          })
                        }
                      />
                      Unsur dengan skor SKM
                    </label>
                  )}
                  <div style={{ marginLeft: 'auto', display: 'flex' }}>
                    <Button
                      variant="ghost"
                      style={{ fontSize: 10 }}
                      onClick={() =>
                        onChange({
                          ...survey,
                          questions: [
                            ...survey.questions,
                            {
                              ...q,
                              id: crypto.randomUUID(),
                              label: `${q.label} (salinan)`,
                              options: q.options.map((o) => ({ ...o, id: crypto.randomUUID() })),
                              scored: false,
                            },
                          ],
                        })
                      }
                    >
                      <Copy size={12} />
                      Duplikat
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={hasResponses || survey.questions.length === 1}
                      aria-label={`Hapus ${q.label}`}
                      onClick={() =>
                        onChange({
                          ...survey,
                          questions: survey.questions.filter((p) => p.id !== q.id),
                          widgets: survey.widgets.filter((w) => w.questionId !== q.id),
                        })
                      }
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
