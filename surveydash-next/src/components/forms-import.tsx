'use client';
import { workspaceFetch } from '@/lib/workspace-request';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, ArrowRight } from 'lucide-react';
import type { FormImportPreview } from '@/lib/form-responses-import';
import { MAX_IMPORT_FILE_BYTES } from '@/lib/form-import-limits';
import { Button, Badge } from './ui';
import { GoogleFormsConnection } from './google-forms-connection';
export function FormsImport({ googleFailed = false }: { googleFailed?: boolean }) {
  const router = useRouter();
  const [preview, setPreview] = useState<FormImportPreview | null>(null);
  const [acknowledge, setAcknowledge] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  function showPreview(value: FormImportPreview) {
    setPreview(value);
    setAcknowledge(false);
    setError('');
  }
  async function upload(file: File) {
    setPreview(null);
    setError('');
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setError('File JSON maksimal 4,4 MB. Untuk data lebih besar, sambungkan Google.');
      return;
    }
    setPending(true);
    try {
      const source: unknown = JSON.parse(await file.text());
      const response = await workspaceFetch('/api/import/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', source }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      showPreview(data);
    } catch (failure) {
      setError(
        failure instanceof SyntaxError
          ? 'File JSON tidak valid.'
          : failure instanceof Error
            ? failure.message
            : 'File belum dapat dibaca.',
      );
    } finally {
      setPending(false);
    }
  }
  async function create() {
    if (!preview) return;
    setPending(true);
    setError('');
    try {
      const response = await workspaceFetch('/api/import/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', batchId: preview.batchId, acknowledge }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push('/studio/' + data.id);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Impor gagal.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="import-workflow">
      <ol className="import-steps" aria-label="Langkah impor">
        <li>
          <span>1</span>Sambungkan Google
        </li>
        <li>
          <span>2</span>Tinjau data
        </li>
        <li>
          <span>3</span>Buat survei
        </li>
      </ol>
      <GoogleFormsConnection
        failed={googleFailed}
        onPreview={showPreview}
        onInvalidate={() => setPreview(null)}
        disabled={pending}
      />
      <details className="card import-file">
        <summary>
          <FileUp size={18} />
          Unggah file impor (.json)
        </summary>
        <p>
          Unggah resource Form, atau gabungan pertanyaan dan jawaban dengan format{' '}
          <code>{'{ "form": {...}, "responses": [...] }'}</code>.
        </p>
        <label className="field">
          File JSON (maksimal 4,4 MB)
          <input
            type="file"
            accept="application/json,.json"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = '';
            }}
          />
        </label>
        <a
          className="text-link"
          href="https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list"
          target="_blank"
          rel="noreferrer"
        >
          Panduan format data Google
        </a>
      </details>
      {pending && <p role="status">Menyiapkan data…</p>}
      {error && (
        <div role="alert" className="banner banner-error">
          {error}
        </div>
      )}
      {preview && (
        <section className="card import-preview" aria-label="Pratinjau impor" aria-live="polite">
          <Badge tone="purple">Siap ditinjau</Badge>
          <h2>{preview.title}</h2>
          <div className="import-counts">
            <strong>
              {preview.questions.length}
              <small>Pertanyaan</small>
            </strong>
            <strong>
              {preview.responseCount.toLocaleString('id-ID')}
              <small>Jawaban responden</small>
            </strong>
          </div>
          <p>Survei baru akan disimpan sebagai draft privat. Waktu jawaban lama tetap dipertahankan.</p>
          <details>
            <summary>Lihat pertanyaan</summary>
            <ol>
              {preview.questions.map((q) => (
                <li key={q.id}>{q.label}</li>
              ))}
            </ol>
          </details>
          {!!preview.warnings.length && (
            <>
              <div className="banner">
                <div>
                  <strong>Catatan impor</strong>
                  <ul>
                    {preview.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={acknowledge}
                  onChange={(event) => setAcknowledge(event.target.checked)}
                />
                Saya sudah membaca catatan impor.
              </label>
            </>
          )}
          <Button
            disabled={pending || (!!preview.warnings.length && !acknowledge)}
            onClick={() => void create()}
          >
            {pending ? 'Mengimpor…' : 'Impor sebagai survei baru'}
            <ArrowRight size={16} />
          </Button>
          <p className="hint">
            Salinan sekali impor. Jawaban berikutnya di Google tidak tersinkron otomatis.
          </p>
        </section>
      )}
    </div>
  );
}
