export const categoryChartTypes = ['bar', 'column', 'donut', 'pie', 'stacked', 'lollipop', 'table'] as const;
export const trendChartTypes = ['line', 'area'] as const;
export type CategoryChartType = (typeof categoryChartTypes)[number];
export type TrendChartType = (typeof trendChartTypes)[number];
export type DataChartType = CategoryChartType | TrendChartType;
export const chartCatalog: Record<DataChartType, { label: string; description: string }> = {
  bar: { label: 'Batang mendatar', description: 'Bandingkan kategori dengan label panjang' },
  column: { label: 'Kolom', description: 'Bandingkan jumlah pada setiap kategori' },
  donut: { label: 'Donat', description: 'Komposisi jawaban dengan total di tengah' },
  pie: { label: 'Lingkaran', description: 'Lihat bagian dari keseluruhan' },
  stacked: { label: 'Proporsi', description: 'Bandingkan bagian pada satu batang 100%' },
  lollipop: { label: 'Titik', description: 'Perbandingan kategori dengan tampilan ringkas' },
  table: { label: 'Tabel', description: 'Jumlah dan persentase secara rinci' },
  line: { label: 'Garis', description: 'Perubahan jumlah respons dari waktu ke waktu' },
  area: { label: 'Area', description: 'Volume respons sepanjang waktu' },
};
export const chartColors = [
  '#7356d8',
  '#2f8b85',
  '#d99537',
  '#6684c4',
  '#b86c8a',
  '#94a357',
  '#9c8ba8',
  '#707989',
];
