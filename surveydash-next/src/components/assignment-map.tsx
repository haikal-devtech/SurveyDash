'use client';
import { useState, type CSSProperties } from 'react';
import { MapPin, RotateCcw, ZoomIn, ZoomOut, X } from 'lucide-react';
import geography from '@/data/indonesia-provinces.json';
import { assignmentMap } from '@/lib/assignment-map';
import { provinceName } from '@/lib/provinces';
import type { ManagedSurveyorAssignment } from '@/lib/surveyor-types';
import { Button } from './ui';

export function AssignmentMap({
  assignments,
  selected,
  onSelect,
}: {
  assignments: ManagedSurveyorAssignment[];
  selected: string;
  onSelect: (provinceId: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const summary = assignmentMap(assignments);
  const maximum = Math.max(0, ...summary.rows.map((row) => row.tasks));
  const byId = new Map<string, (typeof summary.rows)[number]>(summary.rows.map((row) => [row.id, row]));
  function select(id: string) {
    onSelect(id === selected ? 'all' : id);
  }
  return (
    <section className="assignment-map" aria-labelledby="assignment-map-title">
      <header className="assignment-map-heading">
        <div>
          <h2 id="assignment-map-title">Peta wilayah tugas</h2>
          <p>Sebaran sesuai survei, status, dan pencarian. Pilih provinsi untuk menyaring daftar tim.</p>
        </div>
        <span>
          <MapPin size={15} />
          Indonesia · {summary.rows.length} provinsi
        </span>
      </header>
      <div className="assignment-map-metrics">
        <div>
          <strong>{summary.covered}</strong>
          <span>Provinsi terpetakan</span>
        </div>
        <div>
          <strong>{summary.total}</strong>
          <span>Penugasan</span>
        </div>
        <button type="button" onClick={() => select('unset')} aria-pressed={selected === 'unset'}>
          <strong>{summary.unmapped}</strong>
          <span>Wilayah belum diatur</span>
        </button>
      </div>
      {summary.unmapped > 0 && (
        <p className="assignment-map-hint">
          Pilih “Wilayah belum diatur”, lalu atur provinsi pada baris surveyor di bawah.
        </p>
      )}
      <div className="assignment-map-toolbar">
        <p>Pilih provinsi untuk melihat timnya.</p>
        <div className="actions" role="group" aria-label="Perbesaran peta">
          <Button
            variant="ghost"
            disabled={zoom <= 1}
            onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
            aria-label="Perkecil peta"
          >
            <ZoomOut size={17} />
          </Button>
          <Button
            variant="ghost"
            disabled={zoom >= 3}
            onClick={() => setZoom((value) => Math.min(3, value + 0.5))}
            aria-label="Perbesar peta"
          >
            <ZoomIn size={17} />
          </Button>
          <Button variant="ghost" onClick={() => setZoom(1)} aria-label="Reset perbesaran peta">
            <RotateCcw size={16} />
          </Button>
        </div>
      </div>
      <div
        className="assignment-map-viewport"
        tabIndex={0}
        aria-label="Peta Indonesia. Geser untuk melihat wilayah saat diperbesar."
      >
        <svg
          viewBox={geography.viewBox}
          style={{ width: `${zoom * 100}%` }}
          role="group"
          aria-label="Pilih provinsi penugasan"
        >
          {geography.shapes.map((province) => {
            const row = byId.get(province.id);
            const tasks = row?.tasks ?? 0;
            const label = `${province.name}: ${tasks} penugasan, ${row?.people ?? 0} surveyor`;
            return (
              <path
                key={province.id}
                d={province.path}
                fillRule="evenodd"
                vectorEffect="non-scaling-stroke"
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={selected === province.id}
                data-has-tasks={tasks > 0}
                style={
                  {
                    '--map-intensity': `${Math.round(25 + (75 * Math.log1p(tasks)) / Math.log1p(Math.max(1, maximum)))}%`,
                  } as CSSProperties
                }
                onClick={() => select(province.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    select(province.id);
                  }
                }}
              >
                <title>{label}</title>
              </path>
            );
          })}
        </svg>
      </div>
      <div className="assignment-map-legend">
        <span>
          <i />
          Tanpa penugasan
        </span>
        <span>
          <i className="map-legend-low" />
          Sedikit
        </span>
        <span>
          <i className="map-legend-high" />
          Banyak · maks. {maximum}
        </span>
      </div>
      {selected !== 'all' && (
        <div className="assignment-map-selection" role="status">
          <strong>{selected === 'unset' ? 'Wilayah belum diatur' : provinceName(selected)}</strong>
          <span>Daftar tim ditampilkan di bawah.</span>
          <Button variant="ghost" onClick={() => onSelect('all')}>
            <X size={15} />
            Lihat semua
          </Button>
        </div>
      )}
      <footer className="assignment-map-source">
        Peta wilayah penugasan. Respons per surveyor terlihat pada daftar tim. Geometri:{' '}
        <a href={geography.source} target="_blank" rel="noreferrer">
          denyherianto
        </a>{' '}
        ·{' '}
        <a href="/licenses/indonesia-provinces.txt" target="_blank" rel="noreferrer">
          CC BY 4.0, diolah untuk tampilan
        </a>
        .
      </footer>
    </section>
  );
}
