'use client';
import { useEffect, useEffectEvent, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { ProvinceMapCanvas, MapAttribution } from './province-map-canvas';
import { Button } from './ui';
import { provinces, provinceName, isProvinceId } from '@/lib/provinces';
import { surveyorDirectoryMap } from '@/lib/surveyor-directory-map';
import type { RegisteredSurveyor } from '@/lib/admin-surveyors';
import '@/app/manager-surveyors.css';
export function AdminSurveyors({ initialSurveyors }: Readonly<{ initialSurveyors: RegisteredSurveyor[] }>) {
  const [surveyors, setSurveyors] = useState(initialSurveyors),
    [selected, setSelected] = useState('all');
  const [query, setQuery] = useState(''),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  async function refresh(signal?: AbortSignal) {
    setPending(true);
    try {
      const response = await fetch('/api/admin/surveyors', { cache: 'no-store', signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Daftar surveyor belum dapat dimuat.');
      if (!signal?.aborted) {
        setSurveyors(data.surveyors);
        setError('');
      }
    } catch (failure) {
      if (!signal?.aborted) setError(failure instanceof Error ? failure.message : 'Koneksi gagal.');
    } finally {
      setPending(false);
    }
  }
  const sync = useEffectEvent((signal: AbortSignal) => refresh(signal));
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const check = async () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        await sync(controller.signal);
      } finally {
        running = false;
      }
    };
    const timer = setInterval(() => void check(), 30000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  const summary = surveyorDirectoryMap(surveyors);
  const filtered = surveyors.filter(
    (person) =>
      (selected === 'all' ||
        (selected === 'unset'
          ? !person.provinceId || !isProvinceId(person.provinceId)
          : person.provinceId === selected)) &&
      `${person.fullName} ${person.username}`
        .toLocaleLowerCase('id-ID')
        .includes(query.trim().toLocaleLowerCase('id-ID')),
  );
  function select(id: string) {
    setSelected(id === selected ? 'all' : id);
  }
  return (
    <section className="card admin-surveyor-directory">
      <div className="assignment-map">
        <header className="assignment-map-heading">
          <div>
            <h2>Peta seluruh surveyor</h2>
            <p>
              Semua akun surveyor terdaftar, termasuk yang belum mendapat tugas. Provinsi mengikuti data
              registrasi dan profil.
            </p>
          </div>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => void refresh()}
            aria-label="Perbarui semua surveyor"
          >
            <RefreshCw size={16} className={pending ? 'animate-spin' : ''} />
          </Button>
        </header>
        <div className="assignment-map-metrics">
          <div>
            <strong>{summary.total}</strong>
            <span>Surveyor terdaftar</span>
          </div>
          <div>
            <strong>{summary.rows.filter((row) => row.people > 0).length}</strong>
            <span>Provinsi terisi</span>
          </div>
          <button type="button" aria-pressed={selected === 'unset'} onClick={() => select('unset')}>
            <strong>{summary.unmapped}</strong>
            <span>Provinsi belum diisi</span>
          </button>
        </div>
        <ProvinceMapCanvas
          rows={summary.rows.map((row) => ({
            id: row.id,
            value: row.people,
            label: `${row.name}: ${row.people} surveyor terdaftar`,
            content: (
              <>
                <strong>{row.name}</strong>
                <p className="admin-map-number">
                  {row.people.toLocaleString('id-ID')} <span>surveyor terdaftar</span>
                </p>
              </>
            ),
          }))}
          selected={selected}
          onSelect={select}
          controls={<p className="hint">Arahkan kursor atau pilih provinsi untuk melihat surveyornya.</p>}
        />
        {selected !== 'all' && (
          <div className="assignment-map-selection">
            <strong>{selected === 'unset' ? 'Provinsi belum diisi' : provinceName(selected)}</strong>
            <Button variant="ghost" onClick={() => setSelected('all')}>
              <X size={15} />
              Lihat semua
            </Button>
          </div>
        )}
        <MapAttribution>Peta akun terdaftar, terpisah dari peta wilayah penugasan survei.</MapAttribution>
      </div>
      {error && (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-surveyor-filters">
        <label className="field">
          Cari surveyor
          <input
            className="input"
            value={query}
            maxLength={200}
            placeholder="Nama atau username"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="field">
          Provinsi
          <select className="input" value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="all">Semua provinsi</option>
            <option value="unset">Belum diisi</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="team-result-count" role="status">
        {filtered.length} surveyor ditemukan
      </p>
      <div className="team-table-scroll">
        <table className="team-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Username</th>
              <th>Provinsi profil</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((person) => (
              <tr key={person.userId}>
                <td>{person.fullName}</td>
                <td>@{person.username}</td>
                <td>{person.provinceId ? provinceName(person.provinceId) : 'Belum diisi'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && <p className="hint admin-surveyor-empty">Belum ada surveyor yang cocok.</p>}
    </section>
  );
}
