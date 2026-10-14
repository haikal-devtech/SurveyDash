'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseFormsImport } from '@/lib/forms-import';
import { Button, Badge } from './ui';
import { GoogleFormsConnection } from './google-forms-connection';
export function FormsImport({ googleFailed = false }: { googleFailed?: boolean }) {
  const router = useRouter();
  const [source, setSource] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof parseFormsImport> | null>(null);
  const [acknowledge, setAcknowledge] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [sourceKind, setSourceKind] = useState<'json' | 'google'>('json');
  function inspect() {
    setError('');
    setPreview(null);
    setAcknowledge(false);
    try {
      setPreview(parseFormsImport(JSON.parse(source)));
    } catch {
      setError(
        'File tidak dapat dibaca. Gunakan JSON resource Form dari Google Forms API, dengan info dan items yang valid.',
      );
    }
  }
  async function upload(file: File) {
    if (file.size > 500000) {
      setError('File JSON maksimal 500 KB.');
      return;
    }
    setSource(await file.text());
    setPreview(null);
  }
  async function create() {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/import/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: JSON.parse(source), acknowledge }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push(`/studio/${data.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Impor gagal.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <GoogleFormsConnection
        failed={googleFailed}
        onSource={(value) => {
          try {
            setSource(JSON.stringify(value));
            setPreview(parseFormsImport(value));
            setAcknowledge(false);
            setSourceKind('google');
            setError('');
          } catch {
            setError('Form belum dapat dibaca. Periksa sumber dan coba lagi.');
          }
        }}
      />
      <div className="card membership-card">
        <Badge>{sourceKind === 'google' ? 'Form dari Google' : 'Impor JSON'}</Badge>
        <h2 style={{ marginTop: 20 }}>Pindahkan pertanyaan Google Forms.</h2>
        <p>
          {sourceKind === 'google'
            ? 'Tinjau pertanyaan dari form yang Anda pilih.'
            : 'Unggah JSON resource Form yang diperoleh dari Google Forms API.'}{' '}
          Ini membuat survei draft baru; jawaban lama, lampiran, dan setelan berbagi Google tidak ikut
          disalin.
        </p>
        {sourceKind === 'json' && (
          <>
            <a
              className="text-link"
              href="https://developers.google.com/workspace/forms/api/reference/rest/v1/forms/get"
              target="_blank"
              rel="noreferrer"
            >
              Panduan mengambil resource Form
            </a>
            <label className="field" style={{ marginTop: 25 }}>
              File JSON
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </label>
            <label className="field">
              Atau tempel JSON
              <textarea
                style={{ height: 180, fontFamily: 'monospace' }}
                value={source}
                maxLength={500000}
                onChange={(event) => {
                  setSource(event.target.value);
                  setPreview(null);
                }}
              />
            </label>
            <Button variant="secondary" disabled={!source || pending} onClick={inspect}>
              Tinjau pertanyaan
            </Button>
          </>
        )}
        {sourceKind === 'google' && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              setSourceKind('json');
              setSource('');
              setPreview(null);
              setAcknowledge(false);
            }}
          >
            Gunakan file JSON
          </Button>
        )}
        {error && (
          <div role="alert" className="banner banner-error">
            {error}
          </div>
        )}
        {preview && (
          <div className="import-preview">
            <h3>{preview.title}</h3>
            <p>{preview.questions.length} pertanyaan akan dibuat sebagai survei khusus.</p>
            <ul>
              {preview.questions.map((q) => (
                <li key={q.id}>
                  {q.label} <Badge>{q.type}</Badge>
                </li>
              ))}
            </ul>
            {preview.warnings.length > 0 && (
              <>
                <div className="banner">
                  <strong>Catatan sebelum impor</strong>
                  <ul>
                    {preview.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={acknowledge}
                    onChange={(event) => setAcknowledge(event.target.checked)}
                  />
                  Saya sudah meninjau pertanyaan dan item yang tidak dipindahkan.
                </label>
              </>
            )}
            <Button
              disabled={pending || (!!preview.warnings.length && !acknowledge)}
              onClick={() => void create()}
            >
              {pending ? 'Mengimpor…' : 'Buat survei draft'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
