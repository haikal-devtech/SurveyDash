'use client';
import { useState } from 'react';
import { MapPin, Target, X } from 'lucide-react';
import { ProvinceMapCanvas, MapAttribution } from './province-map-canvas';
import { assignmentMap, provinceMapLabel, type ProvinceMapRow } from '@/lib/assignment-map';
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
  provinceResponses,
  selected,
  onSelect,
  onEditTarget,
}: Readonly<{
  assignments: ManagedSurveyorAssignment[];
  targets?: ProvinceTarget[];
  unattributedResponses?: number;
  provinceResponses?: { provinceId: string | null; count: number }[];
  selected: string;
  onSelect: (provinceId: string) => void;
  onEditTarget?: (provinceId?: string) => void;
}>) {
  const [metric, setMetric] = useState<'respondents' | 'surveyors'>('respondents');
  const summary = assignmentMap(assignments, targets, unattributedResponses, provinceResponses);
  const value = (row: ProvinceMapRow) => (metric === 'respondents' ? row.respondents : row.activePeople);
  const maximum = Math.max(0, ...summary.rows.map(value));
  const byId = new Map(summary.rows.map((row) => [row.id, row]));
  const selectedRow = byId.get(selected);
  function select(id: string) {
    onSelect(id === selected ? 'all' : id);
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
      <ProvinceMapCanvas
        selected={selected}
        onSelect={select}
        rows={summary.rows.map((row) => ({
          id: row.id,
          value: value(row),
          label: provinceMapLabel(row),
          content: (
            <>
              <strong>{row.name}</strong>
              <ProvinceNumbers row={row} />
              <ProvinceProgress row={row} />
            </>
          ),
        }))}
        controls={
          <>
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
            {onEditTarget && (
              <Button variant="secondary" onClick={() => onEditTarget(selectedRow?.id)}>
                <Target size={15} />
                Atur target
              </Button>
            )}
          </>
        }
      />
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
      <MapAttribution>
        Responden = jawaban tersimpan melalui link surveyor, mengikuti wilayah tugas saat ini. Target tidak
        menutup form.
      </MapAttribution>
    </section>
  );
}
