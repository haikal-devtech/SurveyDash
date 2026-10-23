'use client';
import { provinces } from '@/lib/provinces';
import { emptyResponseFilters, type ResponseFilters as FilterValues } from '@/lib/response-filters';
import { Button } from './ui';
export function ResponseFilters({
  value,
  onChange,
}: {
  value: FilterValues;
  onChange: (value: FilterValues) => void;
}) {
  return (
    <details className="card" style={{ padding: 14, marginBlock: 12 }}>
      <summary>Filter wilayah, surveyor dan tanggal</summary>
      <div
        className="fieldwork-filters"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14 }}
      >
        <label className="field">
          Provinsi saat respons dikirim
          <select
            value={value.province}
            onChange={(event) => onChange({ ...value, province: event.target.value })}
          >
            <option value="">Semua wilayah</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Username Surveyor
          <input
            maxLength={100}
            value={value.surveyor}
            onChange={(event) => onChange({ ...value, surveyor: event.target.value })}
            placeholder="Misalnya: haikal"
          />
        </label>
        <label className="field">
          Dari tanggal (WIB)
          <input
            type="date"
            max={value.before || undefined}
            value={value.after}
            onChange={(event) => onChange({ ...value, after: event.target.value })}
          />
        </label>
        <label className="field">
          Sampai tanggal (WIB)
          <input
            type="date"
            min={value.after || undefined}
            value={value.before}
            onChange={(event) => onChange({ ...value, before: event.target.value })}
          />
        </label>
        <Button variant="ghost" type="button" onClick={() => onChange({ ...emptyResponseFilters })}>
          Hapus filter
        </Button>
      </div>
      <p className="hint">Respons lama tanpa snapshot provinsi tetap tersedia pada Semua wilayah.</p>
    </details>
  );
}
