import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { AppError, getSurvey, getTemplate } from './repository';
import { getSurveyInsights, getQuestionBreakdown } from './responses-repository';
import type { Survey } from './types';
import {
  generateSlides,
  presentationInputSchema,
  refreshPresentationData,
  type PresentationDocument,
  type PresentationTheme,
  type SlideSection,
} from './presentation-model';
type Row = Record<string, string | number | null>;
const decode = (row: Row): PresentationDocument => JSON.parse(String(row.payload));
async function refreshStoredData(document: PresentationDocument, survey: Survey) {
  const insights = await getSurveyInsights(survey.id, survey.ownerId);
  const ids = new Set(
    document.slides.flatMap((slide) =>
      slide.elements.flatMap((element) =>
        element.binding?.kind === 'chart' && element.binding.questionId ? [element.binding.questionId] : [],
      ),
    ),
  );
  for (const id of ids) {
    const question = survey.questions.find((q) => q.id === id);
    if (question && !question.options.length)
      insights.questions[id].distribution = (await getQuestionBreakdown(survey.id, survey.ownerId, id)).rows;
  }
  return refreshPresentationData(document, survey, [], insights);
}
export async function listPresentations(surveyId: string, ownerId: string, includeArchived = false) {
  await getSurvey(surveyId, ownerId);
  return (
    await getDb()
      .prepare(
        'SELECT payload FROM presentations WHERE survey_id = ? AND owner_id = ? ORDER BY updated_at DESC',
      )
      .all(surveyId, ownerId)
  )
    .map(decode)
    .filter((d) => includeArchived || !d.archivedAt);
}
export async function getPresentation(id: string, ownerId: string) {
  const row = await getDb()
    .prepare('SELECT * FROM presentations WHERE id = ? AND owner_id = ?' + getDb().lockSuffix)
    .get(id, ownerId);
  if (!row) throw new AppError('Presentasi tidak ditemukan.', 404);
  return decode(row);
}
async function insert(document: PresentationDocument) {
  await getDb()
    .prepare('INSERT INTO presentations VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      document.id,
      document.surveyId,
      document.ownerId,
      JSON.stringify(document),
      document.createdAt,
      document.updatedAt,
    );
}
export async function createPresentation(
  surveyId: string,
  ownerId: string,
  title: string,
  theme: PresentationTheme,
  sections: SlideSection[],
) {
  const survey = await getSurvey(surveyId, ownerId);
  if (survey.deletedAt) throw new AppError('Pulihkan survei sebelum membuat presentasi.');
  if (sections.includes('ikm') && survey.kind !== 'skm')
    throw new AppError('Slide IKM hanya tersedia untuk survei SKM.');
  const now = new Date().toISOString();
  const document: PresentationDocument = {
    id: randomUUID(),
    surveyId,
    ownerId,
    title,
    theme,
    slides: generateSlides(survey, [], theme, sections, randomUUID),
    version: 1,
    sourceRevision: '',
    demo: survey.demo,
    createdAt: now,
    updatedAt: now,
  };
  const refreshed = await refreshStoredData(document, survey);
  presentationInputSchema.parse(refreshed);
  await insert(refreshed);
  return refreshed;
}
export async function updatePresentation(id: string, ownerId: string, input: unknown) {
  const parsed = presentationInputSchema.parse(input);
  return getDb().transaction(async () => {
    const before = await getPresentation(id, ownerId);
    if (before.archivedAt) throw new AppError('Presentasi sudah diarsipkan.');
    if (before.version !== parsed.version)
      throw new AppError('Presentasi diperbarui di tab lain. Muat ulang untuk melanjutkan.', 409);
    const assets = [
      ...new Set(
        parsed.slides.flatMap((s) => s.elements.filter((e) => e.type === 'image').map((e) => e.assetId!)),
      ),
    ];
    for (const assetId of assets) {
      const asset = await getDb()
        .prepare('SELECT id FROM presentation_assets WHERE id = ? AND owner_id = ?')
        .get(assetId, ownerId);
      if (!asset) throw new AppError('Gambar tidak ditemukan di workspace Anda.', 404);
    }
    const survey = await getSurvey(before.surveyId, ownerId);
    const after: PresentationDocument = await refreshStoredData(
      { ...before, ...parsed, version: before.version + 1, updatedAt: new Date().toISOString() },
      survey,
    );
    await getDb()
      .prepare('UPDATE presentations SET payload = ?, updated_at = ? WHERE id = ? AND owner_id = ?')
      .run(JSON.stringify(after), after.updatedAt, id, ownerId);
    return after;
  });
}
export async function refreshPresentation(id: string, ownerId: string, version: number) {
  return getDb().transaction(async () => {
    const before = await getPresentation(id, ownerId);
    if (before.version !== version)
      throw new AppError('Presentasi berubah. Simpan atau muat ulang terlebih dahulu.', 409);
    const survey = await getSurvey(before.surveyId, ownerId);
    const refreshed = await refreshStoredData(before, survey);
    return updatePresentation(id, ownerId, refreshed);
  });
}
export async function managePresentation(
  id: string,
  ownerId: string,
  action: 'duplicate' | 'archive' | 'unarchive',
  title?: string,
) {
  return getDb().transaction(async () => {
    const before = await getPresentation(id, ownerId);
    const now = new Date().toISOString();
    if (action === 'duplicate') {
      const after: PresentationDocument = {
        ...structuredClone(before),
        id: randomUUID(),
        title: title ?? `${before.title.slice(0, 180)} (salinan)`,
        version: 1,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      await insert(after);
      return after;
    }
    const after = {
      ...before,
      archivedAt: action === 'unarchive' ? null : now,
      version: before.version + 1,
      updatedAt: now,
    };
    if (action === 'archive')
      await getDb()
        .prepare(
          'UPDATE presentation_shares SET revoked_at = ?, updated_at = ? WHERE presentation_id = ? AND owner_id = ?',
        )
        .run(now, now, id, ownerId);
    await getDb()
      .prepare('UPDATE presentations SET payload = ?, updated_at = ? WHERE id = ? AND owner_id = ?')
      .run(JSON.stringify(after), now, id, ownerId);
    return after;
  });
}

export async function saveSlideTemplate(id: string, ownerId: string, name: string) {
  const document = await getPresentation(id, ownerId);
  const survey = await getSurvey(document.surveyId, ownerId);
  const templateId = randomUUID();
  const now = new Date().toISOString();
  const slides = document.slides.map((slide) => ({
    ...slide,
    elements: slide.elements.map((element) => {
      const clean = { ...element };
      delete clean.data;
      delete clean.missing;
      return { ...clean, text: element.binding?.kind === 'metric' ? '—' : element.text };
    }),
  }));
  const payload = {
    name,
    description: 'Template slide dari Studio presentasi.',
    category: 'presentation',
    kind: survey.kind,
    questions: survey.questions,
    widgets: [],
    settings: { description: '', institution: '', target: 400 },
    slidePreset: { theme: document.theme, slides },
    archivedAt: null,
  };
  await getDb()
    .prepare('INSERT INTO templates VALUES (?, ?, ?, ?, ?)')
    .run(templateId, ownerId, name, JSON.stringify(payload), now);
  return getTemplate(templateId, ownerId);
}
export async function createFromSlideTemplate(
  templateId: string,
  ownerId: string,
  surveyId: string,
  mapping: Record<string, string>,
) {
  const template = await getTemplate(templateId, ownerId);
  if (!template.slidePreset || template.archivedAt) throw new AppError('Template slide tidak tersedia.');
  const survey = await getSurvey(surveyId, ownerId);
  if (survey.deletedAt) throw new AppError('Pulihkan survei sebelum membuat presentasi.');
  const slides = template.slidePreset.slides.map((slide) => ({
    ...slide,
    id: randomUUID(),
    elements: slide.elements.map((element) => {
      let binding = element.binding;
      if (binding?.kind === 'chart') {
        const target = survey.questions.find((q) => q.id === mapping[binding!.questionId!]);
        if (!target) throw new AppError('Pilih sumber pertanyaan yang sesuai untuk semua grafik.');
        binding = { ...binding, questionId: target.id };
      }
      return { ...element, id: randomUUID(), binding };
    }),
  }));
  const now = new Date().toISOString();
  const document: PresentationDocument = {
    id: randomUUID(),
    ownerId,
    surveyId,
    title: template.name,
    theme: template.slidePreset.theme,
    slides,
    version: 1,
    sourceRevision: '',
    demo: survey.demo,
    createdAt: now,
    updatedAt: now,
  };
  presentationInputSchema.parse(document);
  for (const slide of slides)
    for (const element of slide.elements)
      if (element.assetId) {
        const asset = await getDb()
          .prepare('SELECT id FROM presentation_assets WHERE id = ? AND owner_id = ?')
          .get(element.assetId, ownerId);
        if (!asset) throw new AppError('Gambar template tidak ditemukan.', 404);
      }
  const refreshed = await refreshStoredData(document, survey);
  await insert(refreshed);
  return refreshed;
}
