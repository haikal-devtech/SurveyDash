// Province names from the pinned map source; IDs are internal slugs, not official administrative codes.
export const provinces = [
  {
    id: 'aceh',
    name: 'Aceh',
  },
  {
    id: 'bali',
    name: 'Bali',
  },
  {
    id: 'banten',
    name: 'Banten',
  },
  {
    id: 'bengkulu',
    name: 'Bengkulu',
  },
  {
    id: 'daerah-istimewa-yogyakarta',
    name: 'Daerah Istimewa Yogyakarta',
  },
  {
    id: 'dki-jakarta',
    name: 'DKI Jakarta',
  },
  {
    id: 'gorontalo',
    name: 'Gorontalo',
  },
  {
    id: 'jambi',
    name: 'Jambi',
  },
  {
    id: 'jawa-barat',
    name: 'Jawa Barat',
  },
  {
    id: 'jawa-tengah',
    name: 'Jawa Tengah',
  },
  {
    id: 'jawa-timur',
    name: 'Jawa Timur',
  },
  {
    id: 'kalimantan-barat',
    name: 'Kalimantan Barat',
  },
  {
    id: 'kalimantan-selatan',
    name: 'Kalimantan Selatan',
  },
  {
    id: 'kalimantan-tengah',
    name: 'Kalimantan Tengah',
  },
  {
    id: 'kalimantan-timur',
    name: 'Kalimantan Timur',
  },
  {
    id: 'kalimantan-utara',
    name: 'Kalimantan Utara',
  },
  {
    id: 'kepulauan-bangka-belitung',
    name: 'Kepulauan Bangka Belitung',
  },
  {
    id: 'kepulauan-riau',
    name: 'Kepulauan Riau',
  },
  {
    id: 'lampung',
    name: 'Lampung',
  },
  {
    id: 'maluku',
    name: 'Maluku',
  },
  {
    id: 'maluku-utara',
    name: 'Maluku Utara',
  },
  {
    id: 'nusa-tenggara-barat',
    name: 'Nusa Tenggara Barat',
  },
  {
    id: 'nusa-tenggara-timur',
    name: 'Nusa Tenggara Timur',
  },
  {
    id: 'papua',
    name: 'Papua',
  },
  {
    id: 'papua-barat',
    name: 'Papua Barat',
  },
  {
    id: 'papua-barat-daya',
    name: 'Papua Barat Daya',
  },
  {
    id: 'papua-pegunungan',
    name: 'Papua Pegunungan',
  },
  {
    id: 'papua-selatan',
    name: 'Papua Selatan',
  },
  {
    id: 'papua-tengah',
    name: 'Papua Tengah',
  },
  {
    id: 'riau',
    name: 'Riau',
  },
  {
    id: 'sulawesi-barat',
    name: 'Sulawesi Barat',
  },
  {
    id: 'sulawesi-selatan',
    name: 'Sulawesi Selatan',
  },
  {
    id: 'sulawesi-tengah',
    name: 'Sulawesi Tengah',
  },
  {
    id: 'sulawesi-tenggara',
    name: 'Sulawesi Tenggara',
  },
  {
    id: 'sulawesi-utara',
    name: 'Sulawesi Utara',
  },
  {
    id: 'sumatera-barat',
    name: 'Sumatera Barat',
  },
  {
    id: 'sumatera-selatan',
    name: 'Sumatera Selatan',
  },
  {
    id: 'sumatera-utara',
    name: 'Sumatera Utara',
  },
] as const;
export function isProvinceId(value: string) {
  return provinces.some((province) => province.id === value);
}
export function provinceName(id?: string | null) {
  return provinces.find((province) => province.id === id)?.name ?? 'Belum diatur';
}
