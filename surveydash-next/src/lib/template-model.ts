import { z } from 'zod';
import { allowedWidgets, ModelError, surveyInputSchema } from './model';
import { defaultWidgets, templateDefinitions } from './templates';
import type { Question, SavedTemplate, Survey, TemplateCategory, Widget } from './types';

export const templateMetadataSchema = z.object({
  name: z.string().trim().min(3).max(200),
  description: z.string().trim().max(1000).default(''),
  category: z.enum(['form', 'presentation', 'survey']).default('form'),
});
export const templateLabels: Record<TemplateCategory, string> = {
  form: 'Form',
  presentation: 'Presentasi',
  survey: 'Paket survei',
};
export const systemTemplates: SavedTemplate[] = [
  ...templateDefinitions.map((t): SavedTemplate => ({
    ...t,
    category: 'form',
    widgets: [],
    settings: { description: '', institution: '', target: 400 },
    createdAt: null,
    archivedAt: null,
    builtIn: true,
  })),
  ...templateDefinitions
    .filter((t) => t.id !== 'blank')
    .map((t): SavedTemplate => ({
      id: `presentation-${t.id}`,
      name: `Presentasi ${t.name.toLowerCase()}`,
      description: 'Susunan kartu angka, grafik, dan catatan yang siap disesuaikan.',
      category: 'presentation',
      kind: t.kind,
      questions: t.questions,
      widgets: defaultWidgets(t.kind),
      settings: { description: '', institution: '', target: 400 },
      createdAt: null,
      archivedAt: null,
      builtIn: true,
    })),
];

export function templateFromSurvey(
  survey: Survey,
  metadata: { name: string; description?: string; category?: TemplateCategory },
  id: string,
  createdAt: string,
): SavedTemplate {
  const data = templateMetadataSchema.parse(metadata);
  const snapshot = surveyInputSchema.parse(survey);
  if (data.category !== 'form' && !snapshot.widgets.length)
    throw new ModelError('Tambahkan komponen presentasi sebelum menyimpan template ini.');
  return {
    id,
    ...data,
    kind: snapshot.kind,
    questions: structuredClone(snapshot.questions),
    widgets: data.category === 'form' ? [] : structuredClone(snapshot.widgets),
    settings: {
      description: snapshot.description,
      institution: snapshot.institution,
      target: data.category === 'survey' ? snapshot.target : 400,
    },
    createdAt,
    archivedAt: null,
    builtIn: false,
  };
}

// Old question-only templates remain usable without a destructive database migration.
export function decodeTemplate(row: Record<string, string | number | null>): SavedTemplate {
  const payload = JSON.parse(String(row.payload));
  return {
    id: String(row.id),
    name: String(row.name),
    description: payload.description ?? '',
    category: payload.category ?? 'form',
    kind: payload.kind,
    questions: payload.questions,
    widgets: payload.widgets ?? [],
    settings: payload.settings ?? { description: '', institution: '', target: 400 },
    createdAt: String(row.created_at),
    archivedAt: payload.archivedAt ?? null,
    builtIn: false,
    slidePreset: payload.slidePreset,
  };
}

export function presentationBindings(template: SavedTemplate) {
  return template.questions.filter(
    (q) =>
      template.widgets.some((w) => w.questionId === q.id) ||
      template.slidePreset?.slides.some((s) => s.elements.some((e) => e.binding?.questionId === q.id)),
  );
}
export function compatibleTargets(template: SavedTemplate, source: Question, survey: Survey) {
  const types = template.widgets.filter((w) => w.questionId === source.id).map((w) => w.type);
  if (template.slidePreset) return survey.questions;
  return survey.questions.filter((q) => types.every((type) => allowedWidgets(q).includes(type)));
}
export function suggestBindings(template: SavedTemplate, survey: Survey): Record<string, string> {
  return Object.fromEntries(
    presentationBindings(template).map((source) => {
      const candidates = compatibleTargets(template, source, survey);
      const match =
        candidates.find((q) => q.id === source.id) ?? candidates.find((q) => q.label === source.label);
      return [source.id, match?.id ?? ''];
    }),
  );
}
export function mapPresentation(
  template: SavedTemplate,
  survey: Survey,
  mapping: Record<string, string>,
): Widget[] {
  if (template.archivedAt) throw new ModelError('Pulihkan template sebelum menggunakannya.');
  if (template.category === 'form' || !template.widgets.length)
    throw new ModelError('Template ini tidak memiliki susunan presentasi.');
  const widgets = structuredClone(template.widgets).map((widget) => {
    if (!widget.questionId) return widget;
    const target = survey.questions.find((q) => q.id === mapping[widget.questionId!]);
    if (!target || !allowedWidgets(target).includes(widget.type))
      throw new ModelError(`Pilih sumber data yang sesuai untuk "${widget.title}".`);
    const source = template.questions.find((q) => q.id === widget.questionId);
    return {
      ...widget,
      questionId: target.id,
      title: source?.label === widget.title ? target.label : widget.title,
    };
  });
  surveyInputSchema.parse({ ...survey, widgets });
  return widgets;
}
