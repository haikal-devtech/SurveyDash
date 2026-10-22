'use client';
import { provinces } from '@/lib/provinces';

export function ProvinceField({
  id,
  value,
  onChange,
  disabled,
}: Readonly<{ id: string; value: string; onChange: (value: string) => void; disabled?: boolean }>) {
  return (
    <div className="field">
      <label htmlFor={id}>Provinsi</label>
      <select
        id={id}
        className="input"
        required
        value={value}
        disabled={disabled}
        autoComplete="address-level1"
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled>
          Pilih provinsi
        </option>
        {provinces.map((province) => (
          <option key={province.id} value={province.id}>
            {province.name}
          </option>
        ))}
      </select>
    </div>
  );
}
