'use client';
import type { Answer, Question } from '@/lib/types';
export function QuestionInput({
  question: q,
  value,
  onChange,
  disabled = false,
  number,
  invalid = false,
}: {
  question: Question;
  value: Answer | undefined;
  onChange: (value: Answer) => void;
  disabled?: boolean;
  number?: number;
  invalid?: boolean;
}) {
  const id = `field-${q.id}`;
  return (
    <div className="card form-question" data-question-id={q.id} data-incomplete={invalid || undefined}>
      <label
        className="question-label"
        htmlFor={['choice', 'checkbox', 'rating'].includes(q.type) ? undefined : id}
      >
        {number !== undefined && (
          <span className="respondent-question-number" aria-hidden="true">
            {number}
          </span>
        )}
        <span>
          {q.label}
          {q.required && <span className="required">*</span>}
        </span>
      </label>
      {q.description && (
        <p className="hint" style={{ margin: '-5px 0 12px' }}>
          {q.description}
        </p>
      )}
      {q.type === 'rating' ? (
        <fieldset
          className="rating-options"
          style={{ border: 0, padding: 0, margin: 0 }}
          aria-label={q.label}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
        >
          {q.options.map((o, i) => (
            <label className="rating-option" key={o.id}>
              <input
                type="radio"
                name={q.id}
                value={o.id}
                checked={value === o.id}
                disabled={disabled}
                onChange={() => onChange(o.id)}
                required={q.required}
              />
              <span>{i + 1}</span>
              {o.label}
            </label>
          ))}
        </fieldset>
      ) : q.type === 'choice' || q.type === 'checkbox' ? (
        <fieldset
          style={{ border: 0, padding: 0, margin: 0 }}
          aria-label={q.label}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
        >
          {q.options.map((o) => (
            <label className="radio-option" key={o.id}>
              <input
                type={q.type === 'checkbox' ? 'checkbox' : 'radio'}
                name={q.id}
                value={o.id}
                checked={Array.isArray(value) ? value.includes(o.id) : value === o.id}
                disabled={disabled}
                required={q.type === 'choice' && q.required}
                onChange={(e) => {
                  if (q.type === 'checkbox') {
                    const values = Array.isArray(value) ? value : [];
                    onChange(e.target.checked ? [...values, o.id] : values.filter((v) => v !== o.id));
                  } else onChange(o.id);
                }}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      ) : q.type === 'textarea' ? (
        <textarea
          id={id}
          className="input"
          value={String(value ?? '')}
          disabled={disabled}
          required={q.required}
          maxLength={10000}
          placeholder="Tuliskan jawaban Anda…"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className="input"
          type={q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'}
          value={String(value ?? '')}
          disabled={disabled}
          required={q.required}
          maxLength={10000}
          step={q.type === 'number' ? 'any' : undefined}
          placeholder="Jawaban Anda"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(e) =>
            onChange(q.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)
          }
        />
      )}
      {invalid && (
        <p id={`${id}-error`} className="respondent-question-error">
          Isi pertanyaan ini sebelum mengirim.
        </p>
      )}
    </div>
  );
}
