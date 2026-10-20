import { randomBytes } from 'node:crypto';
import { getDb } from './db';
import { getPresentation } from './presentation-repository';
import { getSurvey, AppError } from './repository';
import { getAsset } from './asset-repository';
import { authBaseUrl } from './origins';
import type { Slide } from './presentation-model';
export interface SharedSnapshot {
  title: string;
  slides: Slide[];
  demo: boolean;
  publishedAt: string;
  sourceVersion: number;
}
export interface ShareStatus {
  active: boolean;
  url?: string;
  publishedAt?: string;
  sourceVersion?: number;
  currentVersion: number;
}
type Row = Record<string, string | number | null>;
const decode = (row: Row): SharedSnapshot => JSON.parse(String(row.payload));
export async function getShareStatus(id: string, ownerId: string): Promise<ShareStatus> {
  const doc = await getPresentation(id, ownerId);
  const row = await getDb()
    .prepare('SELECT * FROM presentation_shares WHERE presentation_id = ? AND owner_id = ?')
    .get(id, ownerId);
  if (!row || row.revoked_at || doc.archivedAt) return { active: false, currentVersion: doc.version };
  const snapshot = decode(row);
  return {
    active: true,
    url: `${authBaseUrl()}/p/${row.token}`,
    publishedAt: snapshot.publishedAt,
    sourceVersion: snapshot.sourceVersion,
    currentVersion: doc.version,
  };
}
export async function publishPresentation(
  id: string,
  ownerId: string,
  version: number,
  acknowledge: boolean,
): Promise<ShareStatus> {
  if (!acknowledge) throw new AppError('Tinjau isi slide dan setujui akses melalui link terlebih dahulu.');
  return getDb().transaction(async () => {
    const doc = await getPresentation(id, ownerId);
    if (doc.version !== version)
      throw new AppError('Presentasi berubah. Simpan atau muat ulang sebelum membagikan.', 409);
    if (doc.archivedAt) throw new AppError('Pulihkan presentasi sebelum membagikan.');
    const survey = await getSurvey(doc.surveyId, ownerId);
    if (survey.deletedAt) throw new AppError('Pulihkan survei sebelum membagikan.');
    for (const slide of doc.slides)
      for (const e of slide.elements) {
        if (e.type === 'image') await getAsset(e.assetId!, ownerId);
        if (e.type === 'chart' && e.binding?.kind !== 'timeline') {
          const q = survey.questions.find((q) => q.id === e.binding?.questionId);
          if (!q?.options.length || !['choice', 'checkbox', 'rating'].includes(q.type))
            throw new AppError(
              'Link berbagi hanya mendukung grafik dari pertanyaan pilihan. Periksa sumber grafik.',
            );
        }
      }
    const now = new Date().toISOString();
    const snapshot: SharedSnapshot = {
      title: doc.title,
      demo: doc.demo,
      publishedAt: now,
      sourceVersion: doc.version,
      slides: doc.slides.map((s) => ({
        ...s,
        elements: s.elements.map((e) => ({
          ...e,
          binding:
            e.type === 'chart'
              ? {
                  kind: e.binding?.kind === 'timeline' ? 'timeline' : 'chart',
                  chartType: e.binding?.chartType,
                }
              : undefined,
        })),
      })),
    };
    const row = await getDb()
      .prepare('SELECT * FROM presentation_shares WHERE presentation_id = ? AND owner_id = ?')
      .get(id, ownerId);
    const token = row && !row.revoked_at ? String(row.token) : randomBytes(24).toString('base64url');
    await getDb()
      .prepare(
        'INSERT INTO presentation_shares VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(presentation_id) DO UPDATE SET token = excluded.token, payload = excluded.payload, updated_at = excluded.updated_at, revoked_at = NULL',
      )
      .run(id, ownerId, token, JSON.stringify(snapshot), now, now, null);
    return getShareStatus(id, ownerId);
  });
}
export async function revokePresentation(id: string, ownerId: string) {
  return getDb().transaction(async () => {
    await getPresentation(id, ownerId);
    const now = new Date().toISOString();
    await getDb()
      .prepare(
        'UPDATE presentation_shares SET revoked_at = ?, updated_at = ? WHERE presentation_id = ? AND owner_id = ?',
      )
      .run(now, now, id, ownerId);
    return { active: false };
  });
}
async function sharedRow(token: string) {
  if (!/^[a-zA-Z0-9_-]{32}$/.test(token)) throw new AppError('Tautan presentasi tidak tersedia.', 404);
  const row = await getDb()
    .prepare('SELECT * FROM presentation_shares WHERE token = ? AND revoked_at IS NULL')
    .get(token);
  if (!row) throw new AppError('Tautan presentasi tidak tersedia.', 404);
  const doc = await getPresentation(String(row.presentation_id), String(row.owner_id));
  const survey = await getSurvey(doc.surveyId, doc.ownerId);
  if (doc.archivedAt || survey.deletedAt) throw new AppError('Tautan presentasi tidak tersedia.', 404);
  return row;
}
export async function getSharedPresentation(token: string) {
  return decode(await sharedRow(token));
}
export async function getSharedAsset(token: string, assetId: string) {
  const row = await sharedRow(token);
  const snapshot = decode(row);
  if (!snapshot.slides.some((s) => s.elements.some((e) => e.type === 'image' && e.assetId === assetId)))
    throw new AppError('Gambar tidak ditemukan.', 404);
  return getAsset(assetId, String(row.owner_id));
}
