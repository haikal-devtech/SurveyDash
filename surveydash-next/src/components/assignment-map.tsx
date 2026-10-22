'use client';
import { useRef, useState, type CSSProperties } from 'react';
import { MapPin, RotateCcw, Target, ZoomIn, ZoomOut, X } from 'lucide-react';
import geography from '@/data/indonesia-provinces.json';
import {
  assignmentMap,
  mapTooltipPosition,
  provinceMapLabel,
  type ProvinceMapRow,
} from '@/lib/assignment-map';
import type { ManagedSurveyorAssignment, ProvinceTarget } from '@/lib/surveyor-types';
import { Button } from './ui';

const number = (value: number) => value.toLocaleString('id-ID');
function ProvinceNumbers({ row }: Readonly<{ row: ProvinceMapRow }>) {
  return (
    <dl className="map-province-numbers">
      <div>
        <dt>Responden</dt>
        <dd>{number(row.respondents)}</dd>
      </div>
      <div>
        <dt>Surveyor aktif</dt>
        <dd>{number(row.activePeople)}</dd>
      </div>
      <div>
        <dt>Target</dt>
        <dd>{row.target === null ? 'Belum diatur' : number(row.target)}</dd>
      </div>
    </dl>
  );
}
function ProvinceProgress({ row }: Readonly<{ row: ProvinceMapRow }>) {
  if (row.target === null) return null;
  const percentage = Math.round((row.respondents / row.target) * 100);
  const excess = row.respondents - row.target;
  return (
    <div className="map-province-progress">
      <div
        role="progressbar"
        aria-label={`Capaian target ${row.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, percentage)}
        aria-valuetext={`${number(percentage)} persen, ${number(row.respondents)} dari target ${number(row.target)}`}
      >
        <i style={{ width: `${Math.min(100, percentage)}%` }} />
      </div>
      <span>
        {number(percentage)}%{excess > 0 ? ` · +${number(excess)} dari target` : ''}
      </span>
    </div>
  );
}

export function AssignmentMap({
  assignments,
  targets = [],
  unattributedResponses = 0,
  selected,
  onSelect,
  onEditTarget,
}: Readonly<{
  assignments: ManagedSurveyorAssignment[];
  targets?: ProvinceTarget[];
  unattributedResponses?: number;
  selected: string;
  onSelect: (provinceId: string) => void;
  onEditTarget?: (provinceId?: string) => void;
}>) {
  const [zoom, setZoom] = useState(1);
  const [metric, setMetric] = useState<'respondents' | 'surveyors'>('respondents');
  const [hovered, setHovered] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const summary = assignmentMap(assignments, targets, unattributedResponses);
  const value = (row: ProvinceMapRow) => (metric === 'respondents' ? row.respondents : row.activePeople);
  const maximum = Math.max(0, ...summary.rows.map(value));
  const byId = new Map(summary.rows.map((row) => [row.id, row]));
  const hoveredRow = hovered ? byId.get(hovered) : undefined;
  const selectedRow = byId.get(selected);
  function select(id: string) {
    onSelect(id === selected ? 'all' : id);
  }
  function positionTooltip(clientX: number, clientY: number) {
    const host = frame.current;
    if (!host) return;
    const bounds = host.getBoundingClientRect();
    const size = tooltip.current?.getBoundingClientRect() ?? {
      width: Math.min(248, bounds.width - 16),
      height: 172,
    };
    const point = mapTooltipPosition(clientX - bounds.left, clientY - bounds.top, bounds, size);
    host.style.setProperty('--map-tooltip-x', `${point.x}px`);
    host.style.setProperty('--map-tooltip-y', `${point.y}px`);
  }
  return (
    <section className="assignment-map" aria-labelledby="assignment-map-title">
      <header className="assignment-map-heading">
        <div>
          <h2 id="assignment-map-title">Peta sebaran survei</h2>
          <p>
            Respons mengikuti wilayah tugas surveyor. Angka mengikuti survei yang dipilih; pencarian dan
            status menyaring daftar tim.
          </p>
        </div>
        <span>
          <MapPin size={15} />
          Indonesia · {summary.rows.length} provinsi
        </span>
      </header>
      <div className="assignment-map-metrics">
        <div>
          <strong>{number(summary.respondents)}</strong>
          <span>Responden · jawaban masuk</span>
        </div>
        <div>
          <strong>{number(summary.people)}</strong>
          <span>Surveyor aktif</span>
        </div>
        <div>
          <strong>{summary.target === null ? '—' : number(summary.target)}</strong>
          <span>Target provinsi · boleh terlewati</span>
        </div>
      </div>
      <div className="assignment-map-coverage">
        <span>{summary.covered} provinsi terpetakan</span>
        <button type="button" onClick={() => select('unset')} aria-pressed={selected === 'unset'}>
          {summary.unmapped} tugas belum diatur
        </button>
        {summary.unmappedRespondents > 0 && (
          <span>{number(summary.unmappedRespondents)} respons belum masuk provinsi</span>
        )}
      </div>
      {unattributedResponses > 0 && (
        <p className="assignment-map-hint">
          {number(unattributedResponses)} respons tanpa link surveyor belum dapat dipetakan.
        </p>
      )}
      <div className="assignment-map-toolbar">
        <div className="team-view-switch" role="group" aria-label="Warna peta berdasarkan">
          <Button
            variant="ghost"
            aria-pressed={metric === 'respondents'}
            onClick={() => setMetric('respondents')}
          >
            Responden
          </Button>
          <Button
            variant="ghost"
            aria-pressed={metric === 'surveyors'}
            onClick={() => setMetric('surveyors')}
          >
            Surveyor
          </Button>
        </div>
        <div className="actions">
          {onEditTarget && (
            <Button variant="secondary" onClick={() => onEditTarget(selectedRow?.id)}>
              <Target size={15} />
              Atur target
            </Button>
          )}
          <div className="actions" role="group" aria-label="Perbesaran peta">
            <Button
              variant="ghost"
              disabled={zoom <= 1}
              onClick={() => setZoom((v) => Math.max(1, v - 0.5))}
              aria-label="Perkecil peta"
            >
              <ZoomOut size={17} />
            </Button>
            <Button
              variant="ghost"
              disabled={zoom >= 3}
              onClick={() => setZoom((v) => Math.min(3, v + 0.5))}
              aria-label="Perbesar peta"
            >
              <ZoomIn size={17} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setZoom(1);
                setHovered(null);
              }}
              aria-label="Reset perbesaran peta"
            >
              <RotateCcw size={16} />
            </Button>
          </div>
        </div>
      </div>
      <div className="assignment-map-stage" ref={frame}>
        <div
          className="assignment-map-viewport"
          tabIndex={0}
          aria-label="Peta Indonesia. Geser untuk melihat wilayah saat diperbesar."
          onScroll={() => setHovered(null)}
        >
          <svg
            viewBox={geography.viewBox}
            style={{ width: `${zoom * 100}%` }}
            role="group"
            aria-label="Pilih provinsi penugasan"
            onPointerLeave={() => setHovered(null)}
          >
            {geography.shapes.map((province) => {
              const row = byId.get(province.id)!;
              const amount = value(row);
              return (
                <path
                  key={province.id}
                  d={province.path}
                  fillRule="evenodd"
                  vectorEffect="non-scaling-stroke"
                  role="button"
                  tabIndex={0}
                  aria-label={provinceMapLabel(row)}
                  aria-pressed={selected === province.id}
                  data-has-value={amount > 0}
                  data-hovered={hovered === province.id}
                  style={
                    {
                      '--map-intensity': `${Math.round(25 + (75 * Math.log1p(amount)) / Math.log1p(Math.max(1, maximum)))}%`,
                    } as CSSProperties
                  }
                  onPointerEnter={(event) => {
                    positionTooltip(event.clientX, event.clientY);
                    setHovered(province.id);
                  }}
                  onPointerMove={(event) => positionTooltip(event.clientX, event.clientY)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    positionTooltip(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    setHovered(province.id);
                  }}
                  onBlur={() => setHovered(null)}
                  onClick={() => select(province.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setHovered(null);
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      select(province.id);
                    }
                  }}
                />
              );
            })}
          </svg>
        </div>
        {hoveredRow && (
          <div ref={tooltip} className="assignment-map-tooltip" role="tooltip">
            <strong>{hoveredRow.name}</strong>
            <ProvinceNumbers row={hoveredRow} />
            <ProvinceProgress row={hoveredRow} />
          </div>
        )}
      </div>
      <div className="assignment-map-legend">
        <span>
          <i />
          {metric === 'respondents' ? 'Belum ada respons' : 'Tanpa surveyor aktif'}
        </span>
        <span>
          <i className="map-legend-low" />
          Sedikit
        </span>
        <span>
          <i className="map-legend-high" />
          Banyak · maks. {number(maximum)} {metric === 'respondents' ? 'respons' : 'surveyor'}
        </span>
      </div>
      {selectedRow && (
        <div className="assignment-map-detail" role="status">
          <div className="assignment-map-detail-heading">
            <strong>{selectedRow.name}</strong>
            <span>Tim untuk provinsi ini ditampilkan di bawah.</span>
            <Button variant="ghost" onClick={() => onSelect('all')}>
              <X size={15} />
              Lihat semua
            </Button>
          </div>
          <ProvinceNumbers row={selectedRow} />
          <ProvinceProgress row={selectedRow} />
        </div>
      )}
      {selected === 'unset' && (
        <div className="assignment-map-selection" role="status">
          <strong>Wilayah belum diatur</strong>
          <span>Pilih Atur pada tugas surveyor di bawah.</span>
          <Button variant="ghost" onClick={() => onSelect('all')}>
            <X size={15} />
            Lihat semua
          </Button>
        </div>
      )}
      <footer className="assignment-map-source">
        Responden = jawaban tersimpan melalui link surveyor, mengikuti wilayah tugas saat ini. Target tidak
        menutup form. Geometri:{' '}
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
