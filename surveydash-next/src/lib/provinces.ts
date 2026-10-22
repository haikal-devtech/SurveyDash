// Catalog data is separate from geometry so ordinary assignment controls stay small.
import names from '../data/indonesia-province-names.json';
export const provinces = names.map((name) => ({
  id: name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
  name,
}));
export function isProvinceId(value: string) {
  return provinces.some((province) => province.id === value);
}
export function provinceName(id?: string | null) {
  return provinces.find((province) => province.id === id)?.name ?? 'Belum diatur';
}
