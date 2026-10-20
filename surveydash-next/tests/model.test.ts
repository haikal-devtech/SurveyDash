import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedWidgets,
  assertAcceptingResponses,
  assertSchemaCompatible,
  calculateStats,
  csvCell,
  validateAnswers,
  surveyInputSchema,
} from '../src/lib/model';
import { skmQuestions, defaultWidgets } from '../src/lib/templates';
import type { Submission, Survey } from '../src/lib/types';

const survey: Survey = {
  id: 'test',
  ownerId: 'owner',
  title: 'Survei uji',
  description: '',
  institution: '',
  kind: 'skm',
  status: 'open',
  visibility: 'link',
  token: 'token',
  questions: skmQuestions,
  widgets: defaultWidgets('skm'),
  target: 100,
  version: 1,
  createdAt: '',
  updatedAt: '',
  demo: false,
};
const response = (score: number): Submission => ({
  id: `r${score}`,
  surveyId: 'test',
  submittedAt: '',
  revision: 1,
  questionSnapshot: structuredClone(skmQuestions),
  answers: Object.fromEntries(skmQuestions.filter((q) => q.scored).map((q) => [q.id, `o${score}`])),
});

test('SKM score uses stable option IDs, exact means, and snapshots', () => {
  assert.equal(calculateStats(survey, [response(4)]).ikm, 100);
  assert.equal(calculateStats(survey, [response(1)]).ikm, 25);
  assert.equal(calculateStats(survey, [response(3), response(4)]).ikm, 87.5);
  const reordered = { ...survey, questions: [...survey.questions].reverse() };
  assert.equal(calculateStats(reordered, [response(3), response(4)]).ikm, 87.5);
  assert.equal(calculateStats(survey, []).ikm, null);
});
test('missing answers do not turn into score 1', () => {
  const first = response(4);
  const second = response(3);
  delete second.answers.u6;
  const stats = calculateStats(survey, [first, second]);
  assert.equal(stats.indicators.find((i) => i.id === 'u6')?.answered, 1);
  assert.equal(stats.indicators.find((i) => i.id === 'u6')?.missing, 1);
  assert.equal(stats.ikm, 88.89);
});
test('only valid answers are stored, including zero and required checkbox validation', () => {
  const text = { ...skmQuestions[0], required: true };
  assert.throws(() => validateAnswers([text], { name: '  ' }), /wajib/);
  const rating = skmQuestions.find((q) => q.id === 'u1')!;
  assert.throws(() => validateAnswers([rating], { u1: 'Sangat sesuai' }), /tidak valid/);
  assert.deepEqual(validateAnswers([rating], { u1: 'o4', injected: 'extra' }), { u1: 'o4' });
  const number = { ...text, id: 'number', type: 'number' as const };
  assert.deepEqual(validateAnswers([number], { number: 0 }), { number: 0 });
  const checkbox = { ...rating, type: 'checkbox' as const };
  assert.throws(() => validateAnswers([checkbox], { u1: [] }), /wajib/);
  assert.throws(() => validateAnswers([checkbox], { u1: ['o1', 'o1'] }), /tidak valid/);
});
test('draft, closed, and private forms cannot accept new responses', () => {
  assert.doesNotThrow(() => assertAcceptingResponses(survey));
  assert.throws(() => assertAcceptingResponses({ ...survey, status: 'draft' }));
  assert.throws(() => assertAcceptingResponses({ ...survey, status: 'closed' }), /ditutup/);
  assert.throws(() => assertAcceptingResponses({ ...survey, visibility: 'private' }));
});
test('schema changes preserve existing responses and reject incompatible graphs', () => {
  assert.doesNotThrow(() => surveyInputSchema.parse(survey));
  assert.throws(() =>
    surveyInputSchema.parse({ ...survey, questions: survey.questions.filter((q) => q.id !== 'u9') }),
  );
  assert.throws(
    () => assertSchemaCompatible(survey, { questions: survey.questions.slice(1) }, true),
    /Duplikasikan/,
  );
  assert.doesNotThrow(() =>
    assertSchemaCompatible(survey, { questions: [...survey.questions].reverse() }, true),
  );
  const text = skmQuestions[0];
  assert.ok(allowedWidgets(text).includes('bar'));
  assert.ok(allowedWidgets(text).includes('table'));
  assert.throws(() =>
    surveyInputSchema.parse({
      ...survey,
      widgets: [{ ...survey.widgets[3], questionId: 'name', type: 'area' }],
    }),
  );
});
test('CSV exports neutralize spreadsheet formulas and quote values', () => {
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell('  @SUM(A1)'), '"\'  @SUM(A1)"');
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
});
