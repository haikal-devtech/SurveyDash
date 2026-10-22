import { mkdir, writeFile } from 'node:fs/promises';

// Pinned data only. No upstream scripts or runtime network dependencies are used.
const revision = '80aa4a90ac7eef5136eaa2b551b6aa5d198be27d';
const repository = 'https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces';
const base = repository.replace('github.com', 'raw.githubusercontent.com') + '/' + revision;
async function get(path) {
  const response = await fetch(base + '/' + path, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error('Map source HTTP ' + response.status);
  return response.text();
}
const [source, license] = await Promise.all([get('GeoJSON/indonesia-38-provinces.geojson'), get('DATA_LICENSE.md')]);
const data = JSON.parse(source);
if (data.type !== 'FeatureCollection' || data.features.length !== 38 || !license.includes('CC BY 4.0')) throw Error('Unexpected map data/license');
const coordinate = ([lon, lat]) => {
  if (![lon, lat].every(Number.isFinite) || lon < 94 || lon > 142 || lat < -12 || lat > 7) throw Error('Out-of-bounds coordinate');
  return [(20 + (lon - 94.5) * 20.5).toFixed(2), (20 + (6.5 - lat) * 20.5).toFixed(2)].join(',');
};
const shapes = data.features.map(feature => {
  const name = feature.properties.PROVINSI;
  if (typeof name !== 'string' || !name.trim()) throw Error('Missing province name');
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const geometry = feature.geometry;
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : geometry.type === 'Polygon' ? [geometry.coordinates] : null;
  if (!polygons) throw Error('Unsupported province geometry');
  const path = polygons.flatMap(polygon => polygon.map(ring => {
    if (ring.length < 4) throw Error('Invalid province ring');
    return 'M' + ring.map(coordinate).join('L') + 'Z';
  })).join('');
  return { id, name, path };
}).sort((a, b) => a.name.localeCompare(b.name, 'id'));
if (new Set(shapes.map(s => s.id)).size !== 38) throw Error('Duplicate province identity');
await mkdir('src/data', { recursive: true });
await writeFile('src/data/indonesia-provinces.json', JSON.stringify({ viewBox: '0 0 1000 400', source: repository + '/tree/' + revision, license: 'CC BY 4.0', shapes }));
const catalog = shapes.map(({ id, name }) => ({ id, name }));
await writeFile('src/lib/provinces.ts', `// Province names from the pinned map source; IDs are internal slugs, not official administrative codes.\nexport const provinces = ${JSON.stringify(catalog, null, 2)} as const;\nexport function isProvinceId(value: string) { return provinces.some(province => province.id === value); }\nexport function provinceName(id?: string | null) { return provinces.find(province => province.id === id)?.name ?? 'Belum diatur'; }\n`);
await mkdir('public/licenses', { recursive: true });
await writeFile('public/licenses/indonesia-provinces.txt', `Indonesia GeoJSON & TopoJSON Maps (38 Provinces) — denyherianto\nSource: ${repository}/tree/${revision}\nLicense: Creative Commons Attribution 4.0 International\nhttps://creativecommons.org/licenses/by/4.0/\nChanges by SurveyDash: coordinates projected to a display-only SVG plane and rounded to 2 decimals; internal slug IDs added; geometry rings retained.\n\n${license}`);
console.log(JSON.stringify({ provinces: shapes.length, bytes: Buffer.byteLength(JSON.stringify(shapes)), names: catalog.map(p => p.name), revision }));
