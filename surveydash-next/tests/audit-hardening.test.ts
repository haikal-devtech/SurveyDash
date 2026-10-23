import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { getDb, closeDatabase } from '../src/lib/db';
import {
  createSurvey,
  updateSurvey,
  submitResponse,
  getSurvey,
  listSubmissions,
  editAnswer,
} from '../src/lib/repository';
import { createSurveyorProfile } from '../src/lib/account-repository';
import {
  assignSurveyor,
  setAssignmentProvince,
  listWorkspaceSurveyors,
  setAssignmentActive,
} from '../src/lib/surveyor-repository';
import { setSurveyorBlock } from '../src/lib/surveyor-blocks';
import { reviewCleaningSubmission } from '../src/lib/cleaning-repository';
import { getSurveyInsights, getResponsePage, countResponseExport } from '../src/lib/responses-repository';
import { visibleQuestions, formPages } from '../src/lib/form-flow';
import { validateAnswers, surveyInputSchema } from '../src/lib/model';
import { formFingerprint, readRespondentDraft, DRAFT_TTL } from '../src/lib/respondent-draft';
import { workspaceRole, assertWorkspaceRole } from '../src/lib/workspace-roles';
import { setWorkspaceMemberRole } from '../src/lib/workspace-team';
import { crossTab, setResponseWeight } from '../src/lib/research-repository';
import { fieldworkOverview, saveFieldwork } from '../src/lib/fieldwork-repository';
import type { Question } from '../src/lib/types';
import {
  freezeDataset,
  getDatasetVersion,
  exportFrozenCsv,
  frozenDatasetSummary,
} from '../src/lib/dataset-repository';
import { InsightAccumulator, streamingBreakdown } from '../src/lib/streaming-insights';
import { calculateStats } from '../src/lib/model';
import { responseTimeline, questionBreakdown } from '../src/lib/analytics-model';
import { editablePresentation } from '../src/lib/presentation-pptx';
import { makeElement } from '../src/lib/presentation-model';
import { createRequire } from 'node:module';

const folder = mkdtempSync(join(tmpdir(), 'studio-audit-hardening-'));
delete process.env.DATABASE_URL;
process.env.STUDIO_DB_PATH = join(folder, 'test.sqlite');
process.env.BETTER_AUTH_SECRET = 'audit-hardening-tests-only-000000000000000000000000000';
test.before(async () => {
  await getDb().prepare('CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT, email TEXT)').run();
  for (const id of ['owner', 'other', 'member', 'collector'])
    await getDb()
      .prepare('INSERT INTO "user" VALUES (?, ?, ?)')
      .run(id, id, id + '@example.test');
  await createSurveyorProfile('collector', {
    username: 'audit_collector',
    fullName: 'Audit Collector',
    provinceId: 'jawa-barat',
    bankName: 'QA',
    accountName: 'QA Name',
    accountNumber: '000123456',
    consent: true,
  });
});
test.after(async () => {
  await closeDatabase();
  assert.ok(
    resolve(folder).startsWith(resolve(tmpdir()) + sep) &&
      resolve(folder).includes('studio-audit-hardening-'),
  );
  rmSync(folder, { recursive: true, force: true });
});
const question = (id: string): Question => ({
  id,
  label: id,
  description: '',
  type: 'choice',
  required: true,
  scored: false,
  options: [
    { id: id + '-a', label: 'A' },
    { id: id + '-b', label: 'B' },
  ],
});
async function survey(owner = 'owner') {
  const source = await createSurvey(owner, 'Audit survey', 'blank');
  return updateSurvey(source.id, owner, {
    ...source,
    questions: [question('one'), question('two')],
    widgets: [],
    status: 'open',
    visibility: 'link',
  });
}
test('accepted-only analysis and exports exclude held/rejected/stale reviews without deleting raw answers', async () => {
  const source = await survey();
  const first = await submitResponse(source.token, { one: 'one-a', two: 'two-a' }, randomUUID());
  const second = await submitResponse(source.token, { one: 'one-b', two: 'two-b' }, randomUUID());
  await reviewCleaningSubmission(source.id, 'owner', 'member', {
    action: 'review',
    submissionId: first.id,
    status: 'valid',
    reason: 'Verified by QA',
    revision: 1,
    expectedReviewedAt: null,
  });
  await reviewCleaningSubmission(source.id, 'owner', 'member', {
    action: 'review',
    submissionId: second.id,
    status: 'excluded',
    reason: 'Confirmed duplicate by QA',
    revision: 1,
    expectedReviewedAt: null,
  });
  const selected = await updateSurvey(source.id, 'owner', { ...source, dataset: 'accepted' });
  const insights = await getSurveyInsights(source.id, 'owner');
  assert.equal(insights.stats.total, 1);
  assert.deepEqual(insights.quality, { all: 2, accepted: 1, held: 0, excluded: 1, unreviewed: 0 });
  assert.equal(await countResponseExport(source.id, 'owner', {}), 1);
  assert.equal(await countResponseExport(source.id, 'owner', { dataset: 'all' }), 2);
  await editAnswer(source.id, 'owner', first.id, 'one', 'one-b', 1, 'member');
  assert.equal((await getSurveyInsights(source.id, 'owner')).stats.total, 0);
  assert.equal((await listSubmissions(selected.id)).length, 2);
});
test('new responses keep province snapshots after assignments move and filtering uses those snapshots', async () => {
  const source = await survey();
  let task = (await assignSurveyor(source.id, 'owner', 'audit_collector', 'owner'))[0];
  await setAssignmentProvince(source.id, 'owner', task.id, 'jawa-barat', 'owner');
  const token = new URL(task.shareUrl).pathname.split('/').at(-1)!;
  await submitResponse(source.token, { one: 'one-a', two: 'two-a' }, randomUUID(), token);
  await setAssignmentProvince(source.id, 'owner', task.id, 'jawa-tengah', 'owner');
  await submitResponse(source.token, { one: 'one-b', two: 'two-b' }, randomUUID(), token);
  const group = (await listWorkspaceSurveyors('owner')).find((row) => row.surveyId === source.id)!;
  assert.equal(group.assignments[0].provinceId, 'jawa-tengah');
  assert.equal(group.provinceResponses?.find((row) => row.provinceId === 'jawa-barat')?.count, 1);
  assert.equal(group.provinceResponses?.find((row) => row.provinceId === 'jawa-tengah')?.count, 1);
  assert.equal((await getResponsePage(source.id, 'owner', { province: 'jawa-barat' })).filtered, 1);
  task = group.assignments[0];
  const elsewhere = await survey('other');
  await assignSurveyor(elsewhere.id, 'other', 'audit_collector', 'other');
  await setSurveyorBlock('owner', 'collector', true, 'Confirmed abuse reviewed by owner', 'owner');
  await assert.rejects(() =>
    submitResponse(source.token, { one: 'one-a', two: 'two-a' }, randomUUID(), token),
  );
  await assert.rejects(() => setAssignmentActive(source.id, 'owner', task.id, true, 'owner'), /dibatasi/);
  assert.equal((await listWorkspaceSurveyors('other'))[0].assignments[0].active, true);
  await setSurveyorBlock('owner', 'collector', false, 'Restored after manual review', 'owner');
  const restored = (await setAssignmentActive(source.id, 'owner', task.id, true, 'owner'))[0];
  assert.notEqual(restored.shareUrl, task.shareUrl);
});
test('conditional required questions are skipped only by valid prior-answer rules and drafts expire or invalidate on schema changes', async () => {
  const first = question('gate'),
    second: Question = {
      ...question('followup'),
      section: 'Follow up',
      showWhen: { questionId: 'gate', operator: 'equals', value: 'gate-a' },
    };
  assert.deepEqual(
    visibleQuestions([first, second], { gate: 'gate-b' }).map((q) => q.id),
    ['gate'],
  );
  assert.deepEqual(validateAnswers([first, second], { gate: 'gate-b', followup: 'followup-a' }), {
    gate: 'gate-b',
  });
  assert.throws(() => validateAnswers([first, second], { gate: 'gate-a' }), /wajib/);
  assert.equal(formPages([first, second]).length, 2);
  const source = await survey();
  assert.equal(surveyInputSchema.safeParse({ ...source, questions: [second, first] }).success, false);
  const fingerprint = formFingerprint([first, second]),
    now = Date.now();
  const draft = JSON.stringify({
    version: 1,
    fingerprint,
    answers: { gate: 'gate-a' },
    requestKey: randomUUID(),
    startedAt: new Date(now).toISOString(),
    savedAt: now,
    sent: false,
  });
  assert.ok(readRespondentDraft(draft, fingerprint, now));
  assert.equal(readRespondentDraft(draft, fingerprint, now + DRAFT_TTL + 1), null);
  assert.equal(readRespondentDraft(draft, formFingerprint([first]), now), null);
});
test('workspace roles separate read-only and field access, and cross-tab weights retain raw counts', async () => {
  const at = new Date().toISOString();
  await getDb()
    .prepare('INSERT INTO workspace_members VALUES (?, ?, 1, ?, ?, ?, ?)')
    .run('owner', 'member', 'owner', 'owner', at, at);
  await setWorkspaceMemberRole('owner', 'owner', 'member', 'viewer');
  assert.equal(await workspaceRole('member', 'owner'), 'viewer');
  assert.throws(() => assertWorkspaceRole('viewer', true), /membaca/);
  assertWorkspaceRole('coordinator', true, 'field');
  assert.throws(() => assertWorkspaceRole('coordinator', false, 'data'), /Koordinator/);
  await assert.rejects(() => setWorkspaceMemberRole('owner', 'member', 'member', 'editor'), /pemilik/);
  const source = await survey();
  const first = await submitResponse(source.token, { one: 'one-a', two: 'two-a' }, randomUUID());
  await submitResponse(source.token, { one: 'one-b', two: 'two-b' }, randomUUID());
  await setResponseWeight(source.id, 'owner', 'member', {
    submissionId: first.id,
    revision: 1,
    weight: 3,
    reason: 'Approved sampling weight',
  });
  const tab = await crossTab(source.id, 'owner', 'one', 'two', true, {}, new AbortController().signal);
  assert.equal(tab.paired, 2);
  assert.equal(tab.weightedTotal, 4);
  assert.equal(tab.cells[0][0].count, 1);
  assert.equal(tab.cells[0][0].percent, 75);
  await assert.rejects(() =>
    crossTab(source.id, 'other', 'one', 'two', false, {}, new AbortController().signal),
  );
  const task = (await assignSurveyor(source.id, 'owner', 'audit_collector', 'owner'))[0];
  await setWorkspaceMemberRole('owner', 'owner', 'member', 'coordinator');
  await saveFieldwork('owner', 'owner', {
    assignmentId: task.id,
    coordinatorId: 'member',
    city: 'Bandung',
    district: 'QA District',
    target: 10,
  });
  const field = await fieldworkOverview('owner');
  assert.equal(field.rows.find((row) => row.assignmentId === task.id)?.city, 'Bandung');
});
test('a final dataset preserves original answers, weights and labels after later corrections and rejects other owners', async () => {
  let source = await survey();
  const response = await submitResponse(source.token, { one: 'one-a', two: 'two-b' }, randomUUID());
  const input = {
    name: 'Final QA result',
    dataset: 'all' as const,
    methodNotes: 'Reviewed sample and collection method',
    acknowledged: true,
  };
  await assert.rejects(() => freezeDataset(source.id, 'owner', 'owner', input), /Tutup/);
  source = await updateSurvey(source.id, 'owner', { ...source, status: 'closed' });
  const frozen = await freezeDataset(source.id, 'owner', 'member', input);
  assert.equal((await getDatasetVersion(source.id, 'owner', frozen.id)).count, 1);
  const summaryBefore = await frozenDatasetSummary(
    source.id,
    'owner',
    frozen.id,
    new AbortController().signal,
  );
  const before = await (
    await exportFrozenCsv(source.id, 'owner', frozen.id, new AbortController().signal)
  ).text();
  await editAnswer(source.id, 'owner', response.id, 'one', 'one-b', 1, 'member');
  const after = await (
    await exportFrozenCsv(source.id, 'owner', frozen.id, new AbortController().signal)
  ).text();
  assert.equal(before, after);
  assert.deepEqual(
    await frozenDatasetSummary(source.id, 'owner', frozen.id, new AbortController().signal),
    summaryBefore,
  );
  assert.ok(before.includes('"A"'));
  await assert.rejects(() => getDatasetVersion(source.id, 'other', frozen.id));
});
test('bounded analysis produces the same scores, distributions, timeline and numeric histogram as the original calculations', async () => {
  const source = await survey();
  for (let i = 0; i < 23; i++)
    await submitResponse(
      source.token,
      { one: i % 2 ? 'one-a' : 'one-b', two: i % 3 ? 'two-a' : 'two-b' },
      randomUUID(),
    );
  const rows = await listSubmissions(source.id);
  const aggregate = new InsightAccumulator(source);
  for (const row of rows) aggregate.add(row);
  assert.deepEqual(aggregate.finish().stats, calculateStats(source, rows));
  assert.deepEqual(aggregate.finish().timeline, responseTimeline(rows));
  const numeric: Question = { ...question('n'), type: 'number', options: [] };
  const numbers = rows.map((row, index) => ({ ...row, answers: { n: index - 10 } }));
  const read = async function* () {
    yield* numbers;
  };
  assert.deepEqual(await streamingBreakdown(numeric, read), questionBreakdown(numeric, numbers));
});
test('editable PowerPoint contains real text, shapes and an Office chart, rather than a full-slide image', async () => {
  const document = {
    id: 'qa',
    ownerId: 'owner',
    surveyId: 'survey',
    title: 'Editable QA deck',
    theme: 'professional' as const,
    version: 1,
    sourceRevision: 'qa:1',
    demo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slides: [
      {
        id: 'slide',
        name: 'QA',
        background: '#ffffff',
        elements: [
          makeElement('text', 'text', { text: 'Editable text & QA' }),
          makeElement('shape', 'shape', { y: 300, w: 100, h: 100 }),
          makeElement('chart', 'chart', {
            y: 410,
            w: 400,
            h: 200,
            binding: { kind: 'chart', questionId: 'one', chartType: 'bar' },
            data: [
              { name: 'A', count: 3 },
              { name: 'B', count: 2 },
            ],
          }),
        ],
      },
    ],
  };
  const deck = await editablePresentation(document, async () => {
    throw new Error('No image expected');
  });
  const bytes = await deck.write({ outputType: 'nodebuffer' });
  const require = createRequire(createRequire(import.meta.url).resolve('pptxgenjs'));
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file('ppt/slides/slide1.xml').async('string');
  assert.ok(xml.includes('Editable text &amp; QA'));
  assert.ok(xml.includes('<p:sp>'));
  assert.ok(xml.includes('graphicFrame'));
  assert.ok(zip.file('ppt/charts/chart1.xml'));
});
