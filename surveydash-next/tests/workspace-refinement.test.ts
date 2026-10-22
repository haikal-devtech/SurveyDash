import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { matchesSurveyor } from '../src/lib/surveyor-search';
import { chartSelection, chartTypesForSource, defaultChartType } from '../src/lib/chart-composer';
import { tourAdvanceIndex, tourBackIndex, tourClosedIndex, tourPlan } from '../src/lib/guided-tour';
import { closeDatabase, getDb } from '../src/lib/db';
import { createSurveyorProfile } from '../src/lib/account-repository';
import {
  assignSurveyor,
  listWorkspaceSurveyors,
  resolveReferral,
  setAssignmentActive,
} from '../src/lib/surveyor-repository';
import { createSurvey, updateSurvey, submitResponse, listSubmissions } from '../src/lib/repository';
import {
  createPresentation,
  updatePresentation,
  saveSlideTemplate,
  createFromSlideTemplate,
} from '../src/lib/presentation-repository';
import { makeElement } from '../src/lib/presentation-model';
import { publishPresentation } from '../src/lib/share-repository';
const directory = mkdtempSync(join(tmpdir(), 'studio-refinement-'));
delete process.env.DATABASE_URL;
process.env.STUDIO_DB_PATH = join(directory, 'test.sqlite');
process.env.BETTER_AUTH_SECRET = 'test-secret-refinement-only-not-production-00000000000';
test.before(async () => {
  await getDb().prepare('CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT, email TEXT)').run();
});
test('surveyor search accepts names, usernames, multiple words and status without merging people with equal names', () => {
  const person = { username: 'haikal_01', fullName: 'Haikal Pasha', active: true };
  assert.equal(matchesSurveyor(person, ' @HAIKAL_01 '), true);
  assert.equal(matchesSurveyor(person, 'pasha haikal'), true);
  assert.equal(matchesSurveyor(person, 'haikal wilayah', 'all', 'Survei Wilayah Dua'), true);
  assert.equal(matchesSurveyor(person, 'haikal', 'inactive'), false);
  assert.equal(matchesSurveyor({ ...person, active: false }, '', 'active'), false);
  assert.equal(matchesSurveyor(person, 'someone else'), false);
  const names = [person, { ...person, username: 'haikal_02' }];
  assert.equal(names.filter((p) => matchesSurveyor(p, 'Haikal Pasha')).length, 2);
  assert.equal(names.filter((p) => matchesSurveyor(p, '@haikal_02')).length, 1);
});
test('chart source changes keep timeline and categorical types compatible, including numeric/text inputs', () => {
  const survey = {
    id: 'q',
    label: 'Pertanyaan',
    description: '',
    type: 'text' as const,
    required: false,
    scored: false,
    options: [],
  };
  assert.deepEqual(chartSelection('__timeline', undefined, 'donut'), {
    sourceId: '__timeline',
    type: 'area',
    title: 'Tren respons',
  });
  assert.equal(chartSelection('q', survey, 'area').type, 'bar');
  assert.equal(chartSelection('q', survey, 'donut').type, 'donut');
  assert.equal(defaultChartType({ ...survey, type: 'number' }), 'column');
  assert.equal(defaultChartType({ ...survey, type: 'rating', scored: true }), 'column');
  assert.ok(!chartTypesForSource('q').includes('line' as never));
  assert.deepEqual(chartTypesForSource('__timeline'), ['line', 'area']);
});
test('closing creation/preview dialogs recovers to a reachable step; back never asks to create a second draft', () => {
  const manager = tourPlan('manager');
  for (const step of ['name', 'template', 'submit'])
    assert.equal(
      tourClosedIndex(
        manager,
        manager.findIndex((s) => s.id === step),
      ),
      0,
    );
  const questions = manager.findIndex((s) => s.id === 'questions');
  assert.equal(tourBackIndex(manager, questions), questions);
  assert.equal(tourBackIndex(manager, 0), 0);
  assert.equal(
    tourBackIndex(
      manager,
      manager.findIndex((s) => s.id === 'form'),
    ),
    questions,
  );
  assert.equal(tourAdvanceIndex(manager, 3, 'survey-create-submit'), 3);
  assert.equal(tourAdvanceIndex(manager, 3, 'created'), questions);
  const surveyor = tourPlan('surveyor', true, true);
  assert.equal(tourClosedIndex(surveyor, 1), 0);
  assert.equal(tourClosedIndex(surveyor, 2), 2);
  assert.equal(tourBackIndex(surveyor, 2), 1);
});
test('workspace team lists only owned assignments; deactivation does not affect another survey, owner, or stored responses', async () => {
  await createSurveyorProfile('member', {
    username: 'team_member',
    fullName: 'Same Person',
    provinceId: 'jawa-barat',
    bankName: 'Private Bank',
    accountName: 'Private Payout',
    accountNumber: '0000123456789',
    consent: true,
  });
  await getDb()
    .prepare('INSERT INTO "user" VALUES (?, ?, ?)')
    .run('member', 'Same Person', 'private@example.test');
  let first = await createSurvey('owner-one', 'First assignment', 'blank');
  first = await updateSurvey(first.id, 'owner-one', { ...first, status: 'open' });
  const second = await createSurvey('owner-one', 'Second assignment', 'blank');
  const foreign = await createSurvey('owner-two', 'Other workspace assignment', 'blank');
  const [assignment] = await assignSurveyor(first.id, 'owner-one', 'team_member', 'owner-one');
  await assignSurveyor(second.id, 'owner-one', 'team_member', 'owner-one');
  await assignSurveyor(foreign.id, 'owner-two', 'team_member', 'owner-two');
  await submitResponse(first.token, { [first.questions[0].id]: 'Synthetic respondent' }, 'team-response');
  const groups = await listWorkspaceSurveyors('owner-one');
  assert.equal(groups.length, 2);
  assert.ok(groups.every((g) => g.surveyId !== foreign.id));
  assert.ok(
    !JSON.stringify(groups).includes('Private Payout') &&
      !JSON.stringify(groups).includes('private@example.test'),
  );
  await assert.rejects(
    () => setAssignmentActive(first.id, 'owner-two', assignment.id, false, 'owner-two'),
    /tidak ditemukan/,
  );
  await setAssignmentActive(first.id, 'owner-one', assignment.id, false, 'owner-one');
  await assert.rejects(
    () => resolveReferral(new URL(assignment.shareUrl).pathname.split('/').at(-1)!),
    /dicabut|tersedia/,
  );
  const after = await listWorkspaceSurveyors('owner-one');
  assert.equal(after.find((g) => g.surveyId === first.id)!.assignments[0].active, false);
  assert.equal(after.find((g) => g.surveyId === second.id)!.assignments[0].active, true);
  assert.equal((await listWorkspaceSurveyors('owner-two'))[0].assignments[0].active, true);
  assert.equal((await listSubmissions(first.id)).length, 1);
});
test('text chart slides are bounded, reusable privately and continue to be blocked from public sharing', async () => {
  let survey = await createSurvey('chart-owner', 'Private categorical import', 'blank');
  survey = await updateSurvey(survey.id, 'chart-owner', { ...survey, status: 'open' });
  const question = survey.questions[0];
  await submitResponse(survey.token, { [question.id]: 'Group A' }, 'text-one');
  await submitResponse(survey.token, { [question.id]: 'Group A' }, 'text-two');
  let doc = await createPresentation(survey.id, 'chart-owner', 'Private chart results', 'professional', []);
  doc.slides[0].elements = [
    makeElement('private-chart', 'chart', {
      binding: { kind: 'chart', questionId: question.id, chartType: 'donut' },
    }),
  ];
  doc = await updatePresentation(doc.id, 'chart-owner', doc);
  assert.deepEqual(doc.slides[0].elements[0].data, [{ name: 'Group A', count: 2 }]);
  await assert.rejects(() => publishPresentation(doc.id, 'chart-owner', doc.version, true), /pilihan/);
  const template = await saveSlideTemplate(doc.id, 'chart-owner', 'Private text template');
  const target = await createSurvey('chart-owner', 'New private chart source', 'blank');
  const reused = await createFromSlideTemplate(template.id, 'chart-owner', target.id, {
    [question.id]: target.questions[0].id,
  });
  assert.deepEqual(reused.slides[0].elements[0].data, []);
});
test.after(async () => {
  await closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
