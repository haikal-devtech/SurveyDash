'use client';
import { useEffect, useRef, useState } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import type { Question, QuestionType, Survey } from '@/lib/types';
import { Badge, Button } from './ui';
import { parseOptionLines } from '@/lib/question-editing';
import { useWorkspacePermissions } from './workspace-permissions';

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
  const { canEdit } = useWorkspacePermissions();
  const [dragged, setDragged] = useState<string | null>(null);
  const [activeId, setActiveId] = useState(survey.questions[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const pendingFocus = useRef(false);
  useEffect(() => {
    if (!pendingFocus.current) return;
    const input = document.getElementById('label-' + activeId) as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.select();
      pendingFocus.current = false;
    }
  }, [activeId, survey.questions]);
  function activate(id: string) {
    pendingFocus.current = true;
    setActiveId(id);
  }
  function change(q: Question) {
    let adjusted = false;
    const questions = survey.questions.map((p) => {
      if (p.id === q.id) return q;
      if (
        p.showWhen?.questionId === q.id &&
        p.showWhen.operator === 'equals' &&
        !q.options.some((option) => option.id === p.showWhen!.value)
      ) {
        adjusted = true;
        return { ...p, showWhen: { questionId: q.id, operator: 'answered' as const } };
      }
      return p;
    });
    if (adjusted)
      setMessage(
        'Syarat pertanyaan terkait diubah menjadi “sudah dijawab” karena pilihan pemicunya dihapus.',
      );
    onChange({ ...survey, questions });
  }
  function add(type: QuestionType, afterId?: string) {
    if (survey.questions.length >= 100) return;
    const options = ['choice', 'checkbox', 'rating'].includes(type)
      ? Array.from({ length: type === 'rating' ? 4 : 2 }, (_, i) => ({
          id: crypto.randomUUID(),
          label:
            type === 'rating' ? ['Tidak puas', 'Kurang puas', 'Puas', 'Sangat puas'][i] : `Pilihan ${i + 1}`,
        }))
      : [];
    const id = crypto.randomUUID();
    const index = afterId ? survey.questions.findIndex((q) => q.id === afterId) + 1 : survey.questions.length;
    onChange({
      ...survey,
      questions: [
        ...survey.questions.slice(0, index),
        {
          id,
          label: 'Pertanyaan baru',
          description: '',
          type,
          required: false,
          scored: false,
          options,
        },
        ...survey.questions.slice(index),
      ],
    });
    activate(id);
  }
  function duplicate(q: Question) {
    if (survey.questions.length >= 100) return;
    const id = crypto.randomUUID();
    const index = survey.questions.findIndex((question) => question.id === q.id) + 1;
    onChange({
      ...survey,
      questions: [
        ...survey.questions.slice(0, index),
        {
          ...q,
          id,
          label: q.label.slice(0, 490) + ' (salinan)',
          scored: false,
          options: q.options.map((option) => ({ id: crypto.randomUUID(), label: option.label })),
        },
        ...survey.questions.slice(index),
      ],
    });
    activate(id);
  }
  function move(id: string, to: number) {
    const next = [...survey.questions];
    const index = next.findIndex((q) => q.id === id);
    if (index < 0 || to < 0 || to >= next.length) return;
    const [question] = next.splice(index, 1);
    next.splice(to, 0, question);
    if (
      next.some(
        (q, i) => q.showWhen && !next.slice(0, i).some((previous) => previous.id === q.showWhen!.questionId),
      )
    ) {
      setMessage('Pertanyaan pemicu harus berada sebelum pertanyaan yang bergantung padanya.');
      return;
    }
    onChange({ ...survey, questions: next });
  }
  return (
    <>
      <div className="panel-intro">
        <div>
          <h2>Pertanyaan</h2>
          <p>{survey.questions.length}/100 pertanyaan · Klik pertanyaan untuk mengedit.</p>
        </div>
        <Button permission="edit" disabled={survey.questions.length >= 100} onClick={() => add('text')}>
          <Plus size={16} />
          Tambah pertanyaan
        </Button>
      </div>
      {hasResponses && (
        <div className="banner">
          <Lock size={14} />
          Survei sudah memiliki respons. Jenis, pilihan, dan skor pertanyaan dikunci agar data tetap
          konsisten.
        </div>
      )}
      {message && (
        <p className="banner" role="status">
          {message}
          <Button variant="ghost" onClick={() => setMessage('')}>
            Tutup
          </Button>
        </p>
      )}
      <div className="builder-layout">
        <aside className="card builder-palette">
          <h3>Tambahkan pertanyaan</h3>
          <div className="palette-list">
            {questionTypes.map((t) => (
              <button
                type="button"
                className="palette-item"
                key={t.type}
                disabled={survey.questions.length >= 100}
                onClick={() => add(t.type, activeId)}
              >
                {t.icon}
                {t.label}
                <Plus size={12} style={{ marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
        </aside>
        <div>
          {survey.questions.map((q, index) => (
            <article
              className={'card question-card simple-question' + (activeId === q.id ? ' is-editing' : '')}
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
                  type="button"
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
                <button
                  type="button"
                  className="question-edit-toggle"
                  aria-expanded={activeId === q.id}
                  aria-controls={'body-' + q.id}
                  onClick={() => setActiveId(activeId === q.id ? '' : q.id)}
                >
                  <strong>{q.label || 'Pertanyaan baru'}</strong>
                  <ChevronDown size={16} />
                </button>
                <Badge>{questionTypes.find((t) => t.type === q.type)?.label}</Badge>
              </div>
              <div className="question-body" id={'body-' + q.id} hidden={activeId !== q.id}>
                <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                  <div className="question-edit-toolbar">
                    <label className="question-type-label">
                      Jenis pertanyaan
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
                    </label>
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
                      Deskripsi <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opsional)</span>
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
                  <details className="card" style={{ padding: 12, marginBlock: 12 }}>
                    <summary>Bagian dan pengaturan lanjutan</summary>
                    <label className="field">
                      Bagian / halaman
                      <input
                        className="input"
                        maxLength={100}
                        value={q.section ?? ''}
                        placeholder="Misalnya: Profil responden"
                        onChange={(event) => change({ ...q, section: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      Tampilkan jika
                      <select
                        disabled={hasResponses}
                        value={q.showWhen?.questionId ?? ''}
                        onChange={(event) =>
                          change({
                            ...q,
                            showWhen: event.target.value
                              ? { questionId: event.target.value, operator: 'answered' }
                              : undefined,
                          })
                        }
                      >
                        <option value="">Selalu tampil</option>
                        {survey.questions.slice(0, index).map((previous) => (
                          <option key={previous.id} value={previous.id}>
                            {previous.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {q.showWhen && (
                      <label className="field">
                        Jawaban pemicu
                        <select
                          disabled={hasResponses}
                          value={q.showWhen.operator === 'answered' ? '' : q.showWhen.value}
                          onChange={(event) =>
                            change({
                              ...q,
                              showWhen: {
                                questionId: q.showWhen!.questionId,
                                operator: event.target.value ? 'equals' : 'answered',
                                value: event.target.value || undefined,
                              },
                            })
                          }
                        >
                          <option value="">Sudah dijawab</option>
                          {survey.questions
                            .find((previous) => previous.id === q.showWhen!.questionId)
                            ?.options.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    {q.type === 'number' && (
                      <div className="actions">
                        {(['min', 'max'] as const).map((bound) => (
                          <label className="field" key={bound}>
                            {bound === 'min' ? 'Minimum' : 'Maksimum'}
                            <input
                              type="number"
                              step="any"
                              value={q.validation?.[bound] ?? ''}
                              disabled={hasResponses}
                              onChange={(event) =>
                                change({
                                  ...q,
                                  validation: {
                                    ...q.validation,
                                    [bound]:
                                      event.target.value === '' ? undefined : Number(event.target.value),
                                  },
                                })
                              }
                            />
                          </label>
                        ))}
                      </div>
                    )}
                    {['text', 'textarea'].includes(q.type) && (
                      <>
                        <label className="field">
                          Maksimum karakter
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            disabled={hasResponses}
                            value={q.validation?.maxLength ?? ''}
                            placeholder="10000"
                            onChange={(event) =>
                              change({
                                ...q,
                                validation: {
                                  ...q.validation,
                                  maxLength: event.target.value ? Number(event.target.value) : undefined,
                                },
                              })
                            }
                          />
                        </label>
                        <label className="field">
                          Format
                          <select
                            disabled={hasResponses}
                            value={q.validation?.format ?? ''}
                            onChange={(event) =>
                              change({
                                ...q,
                                validation: {
                                  ...q.validation,
                                  format: (event.target.value as 'email' | 'phone') || undefined,
                                },
                              })
                            }
                          >
                            <option value="">Teks biasa</option>
                            <option value="email">Email</option>
                            <option value="phone">Nomor telepon</option>
                          </select>
                        </label>
                      </>
                    )}
                  </details>
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
                        disabled={hasResponses || q.options.length >= 50}
                        style={{ marginTop: 8 }}
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
                      {!hasResponses && <BulkOptions question={q} onChange={change} />}
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
                    <label>
                      <input
                        type="checkbox"
                        checked={q.chartVisible ?? q.options.length > 0}
                        onChange={(event) => change({ ...q, chartVisible: event.target.checked })}
                      />
                      Tampilkan chart
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
                        disabled={survey.questions.length >= 100}
                        onClick={() => duplicate(q)}
                      >
                        <Copy size={12} />
                        Duplikat
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={hasResponses || survey.questions.length === 1}
                        aria-label={`Hapus ${q.label}`}
                        onClick={() => {
                          if (activeId === q.id)
                            setActiveId(
                              survey.questions[index + 1]?.id ?? survey.questions[index - 1]?.id ?? '',
                            );
                          onChange({
                            ...survey,
                            questions: survey.questions
                              .filter((p) => p.id !== q.id)
                              .map((p) =>
                                p.showWhen?.questionId === q.id ? { ...p, showWhen: undefined } : p,
                              ),
                            widgets: survey.widgets.filter((w) => w.questionId !== q.id),
                          });
                        }}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </fieldset>
              </div>
            </article>
          ))}
          <Button
            className="builder-add-bottom"
            variant="secondary"
            disabled={survey.questions.length >= 100}
            onClick={() => add('text', activeId)}
          >
            <Plus size={17} />
            Tambah pertanyaan
          </Button>
        </div>
      </div>
    </>
  );
}

function BulkOptions({ question, onChange }: { question: Question; onChange: (question: Question) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  return (
    <details className="bulk-options">
      <summary>Tempel daftar pilihan</summary>
      <label className="field" htmlFor={'bulk-' + question.id}>
        Satu pilihan per baris
        <textarea
          id={'bulk-' + question.id}
          rows={5}
          maxLength={16000}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
          }}
          placeholder={'Sangat baik\nBaik\nCukup\nKurang'}
        />
      </label>
      <p className="hint">Daftar ini mengganti pilihan di atas. Maksimal 50 pilihan.</p>
      {error && (
        <p role="alert" className="banner banner-error">
          {error}
        </p>
      )}
      <Button
        variant="secondary"
        onClick={() => {
          try {
            const labels = parseOptionLines(text);
            onChange({
              ...question,
              options: labels.map((label, index) => ({
                id: question.options.find((option) => option.label === label)?.id ?? crypto.randomUUID(),
                label,
                ...(question.scored ? { score: Math.min(index + 1, 4) } : {}),
              })),
            });
            setError('');
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Daftar belum valid.');
          }
        }}
      >
        Gunakan daftar ini
      </Button>
    </details>
  );
}
