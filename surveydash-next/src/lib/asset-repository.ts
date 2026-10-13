import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { getDb } from './db';
import { AppError } from './repository';
export interface PresentationAsset {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: string;
}
export async function listAssets(ownerId: string): Promise<PresentationAsset[]> {
  return (
    await getDb()
      .prepare(
        'SELECT id, name, width, height, created_at FROM presentation_assets WHERE owner_id = ? ORDER BY created_at DESC LIMIT 100',
      )
      .all(ownerId)
  ).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    width: Number(row.width),
    height: Number(row.height),
    createdAt: String(row.created_at),
  }));
}
export async function getAsset(id: string, ownerId: string) {
  const row = await getDb()
    .prepare('SELECT * FROM presentation_assets WHERE id = ? AND owner_id = ?')
    .get(id, ownerId);
  if (!row) throw new AppError('Gambar tidak ditemukan.', 404);
  return row;
}
export async function uploadAsset(ownerId: string, file: File): Promise<PresentationAsset> {
  if (!file.size || file.size > 2_500_000) throw new AppError('Gambar harus berukuran maksimal 2,5 MB.');
  const buffer = Buffer.from(await file.arrayBuffer());
  let result;
  try {
    const processor = sharp(buffer, { limitInputPixels: 20_000_000 });
    const metadata = await processor.metadata();
    if ((metadata.pages ?? 1) > 1 || !['png', 'jpeg', 'webp'].includes(metadata.format ?? ''))
      throw new Error('Unsupported format');
    result = await processor
      .rotate()
      .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new AppError(
      'Gunakan gambar PNG, JPG, atau WebP yang valid. SVG dan gambar animasi tidak didukung.',
    );
  }
  const id = createHash('sha256').update(ownerId).update(buffer).digest('hex');
  const createdAt = new Date().toISOString();
  const name = file.name.slice(0, 180) || 'Gambar';
  await getDb()
    .prepare('INSERT INTO presentation_assets VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING')
    .run(
      id,
      ownerId,
      name,
      'image/webp',
      result.data.toString('base64'),
      result.info.width,
      result.info.height,
      createdAt,
    );
  const stored = await getAsset(id, ownerId);
  return {
    id,
    name: String(stored.name),
    width: Number(stored.width),
    height: Number(stored.height),
    createdAt: String(stored.created_at),
  };
}
