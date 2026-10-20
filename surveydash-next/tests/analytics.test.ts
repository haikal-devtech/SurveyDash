import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { responseTimeline, questionBreakdown, chartSeries } from '../src/lib/analytics-model';
import { categoryChartTypes, trendChartTypes } from '../src/lib/chart-types';
import { questionSchema, surveyInputSchema } from '../src/lib/model';
import { createSlideLayout, slideLayouts } from '../src/lib/slide-layouts';
import { makeElement, presentationInputSchema } from '../src/lib/presentation-model';
import { closeDatabase } from '../src/lib/db';
import {
  createSurvey,
  updateSurvey,
  submitResponse,
  listSubmissions,
  getSurvey,
} from '../src/lib/repository';
import { getSurveyInsights, getQuestionBreakdown } from '../src/lib/responses-repository';
import {
  createPresentation,
  updatePresentation,
  saveSlideTemplate,
  createFromSlideTemplate,
} from '../src/lib/presentation-repository';
import { publishPresentation, getSharedPresentation } from '../src/lib/share-repository';
import { DataChart } from '../src/components/data-chart';
import { themePreference, resolveTheme } from '../src/lib/theme';
import type { Question, Submission } from '../src/lib/types';
const directory = mkdtempSync(join(tmpdir(), 'studio-analytics-'));
delete process.env.DATABASE_URL;
process.env.STUDIO_DB_PATH = join(directory, 'analytics.sqlite');
const question: Question = {
  id: 'topic',
  label: 'Topik',
  description: '',
  type: 'choice',
  required: false,
  scored: false,
  options: [
    { id: 'a', label: 'Pilihan A' },
    { id: 'b', label: 'Pilihan B' },
  ],
};
const row = (answers: Submission['answers'], submittedAt = '2026-10-20T17:05:00Z'): Submission => ({
  id: randomUUID(),
  surveyId: 'survey',
  answers,
  submittedAt,
  questionSnapshot: [question],
  revision: 1,
});

test('WIB timeline retains every response, midnight boundaries and zero days', () => {
  const result = responseTimeline([
    row({}, '2026-10-19T16:59:59Z'),
    row({}, '2026-10-19T17:00:00Z'),
    row({}, '2026-10-21T17:01:00Z'),
    row({}, 'invalid'),
  ]);
  assert.deepEqual(result.points, [
    { name: '2026-10-19', count: 1 },
    { name: '2026-10-20', count: 1 },
    { name: '2026-10-21', count: 0 },
    { name: '2026-10-22', count: 1 },
  ]);
  const long = responseTimeline(
    Array.from({ length: 1000 }, (_, i) => row({}, new Date(Date.UTC(2023, 0, 1 + i)).toISOString())),
  );
  assert.ok(long.points.length <= 60);
  assert.equal(
    long.points.reduce((sum, point) => sum + point.count, 0),
    1000,
  );
  assert.equal(long.total, 1000);
  assert.deepEqual(responseTimeline([]).points, []);
});
test('category and checkbox breakdowns distinguish respondents from selected answers', () => {
  const result = questionBreakdown({ ...question, type: 'checkbox' }, [
    row({ topic: ['a', 'b'] }),
    row({ topic: ['b'] }),
    row({ topic: [] }),
  ]);
  assert.equal(result.answered, 2);
  assert.equal(result.unit, 'pilihan');
  assert.deepEqual(
    result.rows.map((r) => r.count),
    [1, 2],
  );
  assert.deepEqual(
    questionBreakdown(question, []).rows.map((r) => r.count),
    [0, 0],
  );
});
test('text exploration preserves exact values, excludes whitespace, and blocks high cardinality/long text', () => {
  const text = { ...question, type: 'textarea' as const, options: [] };
  const values = questionBreakdown(text, [
    row({ topic: 'A' }),
    row({ topic: ' A ' }),
    row({ topic: 'A' }),
    row({ topic: ' ' }),
  ]);
  assert.equal(values.answered, 3);
  assert.deepEqual(values.rows, [
    { name: 'A', count: 2 },
    { name: ' A ', count: 1 },
  ]);
  const many = questionBreakdown(
    text,
    Array.from({ length: 120 }, (_, i) => row({ topic: `Private value ${i}` })),
  );
  assert.ok(many.unavailable);
  assert.deepEqual(many.rows, []);
  assert.ok(questionBreakdown(text, [row({ topic: 'x'.repeat(200) })]).unavailable);
  assert.deepEqual(text.options, []);
});
test('number histogram keeps zero, boundaries and constant values without changing source types', () => {
  const numeric = { ...question, type: 'number' as const, options: [] };
  const values = [-10, 0, 0, 2, 5, 10];
  const result = questionBreakdown(
    numeric,
    values.map((topic) => row({ topic })),
  );
  assert.equal(
    result.rows.reduce((sum, r) => sum + r.count, 0),
    values.length,
  );
  assert.equal(result.answered, values.length);
  assert.deepEqual(questionBreakdown(numeric, [row({ topic: 0 }), row({ topic: 0 })]).rows, [
    { name: '0', count: 2 },
  ]);
});
test('grouped chart tails conserve counts and ignore invalid negative values', () => {
  const data = Array.from({ length: 15 }, (_, i) => ({ name: String(i), count: i }));
  const result = chartSeries([...data, { name: 'invalid', count: NaN }, { name: 'negative', count: -3 }], 7);
  assert.equal(result.rows.length, 7);
  assert.equal(result.total, 105);
  assert.equal(
    result.rows.reduce((sum, r) => sum + r.count, 0),
    105,
  );
  assert.equal(result.rows.at(-1)?.name, 'Kategori lainnya (gabungan)');
});
test('all nine renderers emit server-renderable SVG/table without NaN for zero and single-category data', () => {
  for (const type of [...categoryChartTypes, ...trendChartTypes])
    for (const data of [[{ name: 'Only category', count: 3 }], [{ name: 'Zero', count: 0 }]]) {
      const html = renderToStaticMarkup(createElement(DataChart, { type, data, title: 'Chart source' }));
      assert.doesNotMatch(html, /NaN|Infinity/);
      assert.ok(html.includes('data-chart'));
      if (data[0].count)
        assert.match(
          html,
          type === 'table' ? /<table/ : type === 'bar' || type === 'lollipop' ? /chart-bar-row/ : /<svg/,
        );
    }
});
test('theme preferences use explicit overrides and otherwise follow the device', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(themePreference('invalid'), 'system');
  assert.equal(themePreference(null), 'system');
});
test('chart settings persist after responses; private breakdown is opt-in and owner scoped', async () => {
  let survey = await createSurvey('owner', 'Analytics source', 'blank');
  const text = { ...question, id: 'raw', type: 'textarea' as const, options: [] };
  survey = await updateSurvey(survey.id, 'owner', {
    ...survey,
    questions: [question, text],
    widgets: [],
    status: 'open',
  });
  await submitResponse(survey.token, { topic: 'a', raw: 'Keep this exact text' }, 'one');
  const insights = await getSurveyInsights(survey.id, 'owner');
  assert.equal(insights.timeline?.total, 1);
  assert.deepEqual(insights.questions.raw.samples, []);
  assert.deepEqual(insights.questions.raw.distribution, []);
  assert.equal((await getQuestionBreakdown(survey.id, 'owner', 'raw')).rows[0].name, 'Keep this exact text');
  await assert.rejects(() => getQuestionBreakdown(survey.id, 'other', 'raw'), /tidak ditemukan/);
  await assert.rejects(() => getQuestionBreakdown(survey.id, 'owner', 'missing'), /tidak ditemukan/);
  survey = await updateSurvey(survey.id, 'owner', {
    ...survey,
    questions: survey.questions.map((q) => ({ ...q, chartVisible: false, chartType: 'lollipop' })),
  });
  assert.equal((await getSurvey(survey.id, 'owner')).questions[0].chartVisible, false);
  assert.equal(survey.questions[0].chartType, 'lollipop');
  assert.equal((await listSubmissions(survey.id))[0].answers.raw, 'Keep this exact text');
  assert.deepEqual(survey.questions[1].options, []);
  for (const type of categoryChartTypes)
    assert.equal(
      surveyInputSchema.safeParse({
        ...survey,
        widgets: [{ id: 'w', type, title: 'Chart', questionId: 'topic', x: 0, y: 0, w: 6, h: 8 }],
      }).success,
      true,
    );
  assert.equal(
    surveyInputSchema.safeParse({
      ...survey,
      widgets: [
        {
          id: 'w',
          type: 'area',
          title: 'Invalid category trend',
          questionId: 'topic',
          x: 0,
          y: 0,
          w: 6,
          h: 8,
        },
      ],
    }).success,
    false,
  );
  assert.equal(questionSchema.safeParse({ ...question, chartType: 'area' }).success, false);
});
test('six layouts validate, honor hidden charts and fall back to response trends without category questions', async () => {
  const survey = await createSurvey('layout-owner', 'Layout source', 'blank');
  for (const theme of ['professional', 'minimal', 'corporate'] as const)
    for (const layout of slideLayouts) {
      const slide = createSlideLayout(layout.id, survey, theme, randomUUID);
      const result = presentationInputSchema.safeParse({
        title: 'Layout test',
        version: 1,
        theme,
        slides: [slide],
      });
      assert.equal(result.success, true, result.success ? '' : result.error.message);
    }
  const hidden = { ...survey, questions: [{ ...question, chartVisible: false }] };
  const slide = createSlideLayout('chart', hidden, 'professional', randomUUID);
  assert.equal(slide.elements.find((e) => e.type === 'chart')?.binding?.kind, 'timeline');
});
test('saved chart data is authoritative and timeline templates/shares never expose raw answers', async () => {
  let survey = await createSurvey('deck-owner', 'Chart data source', 'blank');
  survey = await updateSurvey(survey.id, 'deck-owner', {
    ...survey,
    questions: [question],
    widgets: [],
    status: 'open',
  });
  await submitResponse(survey.token, { topic: 'a' }, 'deck-response');
  let doc = await createPresentation(survey.id, 'deck-owner', 'Chart deck', 'professional', []);
  doc.slides[0].elements = [
    ...categoryChartTypes.map((type) =>
      makeElement(randomUUID(), 'chart', {
        text: type,
        binding: { kind: 'chart', questionId: question.id, chartType: type },
        data: [{ name: 'Forged', count: 999 }],
      }),
    ),
    ...trendChartTypes.map((type) =>
      makeElement(randomUUID(), 'chart', {
        text: type,
        binding: { kind: 'timeline', chartType: type },
        data: [{ name: 'Forged', count: 999 }],
      }),
    ),
  ];
  doc = await updatePresentation(doc.id, 'deck-owner', doc);
  assert.ok(doc.slides[0].elements.every((e) => e.data?.reduce((sum, r) => sum + r.count, 0) === 1));
  const share = await publishPresentation(doc.id, 'deck-owner', doc.version, true);
  const snapshot = await getSharedPresentation(new URL(share.url!).pathname.split('/').at(-1)!);
  assert.ok(!JSON.stringify(snapshot).includes('questionId'));
  assert.equal(snapshot.slides[0].elements.filter((e) => e.binding?.kind === 'timeline').length, 2);
  doc.slides[0].elements = doc.slides[0].elements.filter((e) => e.binding?.kind === 'timeline');
  doc = await updatePresentation(doc.id, 'deck-owner', doc);
  const template = await saveSlideTemplate(doc.id, 'deck-owner', 'Response trend template');
  const target = await createSurvey('deck-owner', 'New trend source', 'blank');
  const reused = await createFromSlideTemplate(template.id, 'deck-owner', target.id, {});
  assert.ok(reused.slides[0].elements.every((e) => e.binding?.kind === 'timeline' && e.data?.length === 0));
  const invalid = makeElement(randomUUID(), 'chart', {
    binding: { kind: 'timeline', questionId: 'topic', chartType: 'bar' },
  });
  assert.equal(
    presentationInputSchema.safeParse({ ...doc, slides: [{ ...doc.slides[0], elements: [invalid] }] })
      .success,
    false,
  );
});
test.after(async () => {
  await closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
