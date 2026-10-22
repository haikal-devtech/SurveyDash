import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { provinces } from '../src/lib/provinces';
import { assignmentMap, mapTooltipPosition } from '../src/lib/assignment-map';
import { AssignmentMap } from '../src/components/assignment-map';
import { SurveyorTaskProgress } from '../src/components/surveyor-task-progress';
import { createSurveyorProfile } from '../src/lib/account-repository';
import { closeDatabase, getDb } from '../src/lib/db';
import { createSurvey, updateSurvey, submitResponse, listSubmissions } from '../src/lib/repository';
import {
  assignSurveyor,
  listManagedSurveyors,
  listSurveyorAssignments,
  setAssignmentProvince,
  setAssignmentActive,
  setProvinceTarget,
  listProvinceTargets,
  listWorkspaceSurveyors,
} from '../src/lib/surveyor-repository';
import type { ManagedSurveyorAssignment } from '../src/lib/surveyor-types';

const directory = mkdtempSync(join(tmpdir(), 'studio-map-'));
delete process.env.DATABASE_URL;
process.env.STUDIO_DB_PATH = join(directory, 'test.sqlite');
process.env.BETTER_AUTH_SECRET = 'test-only-map-fixture-secret-0000000000000000000000000';
test.before(async () => {
  await getDb().prepare('CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT, email TEXT)').run();
  await createSurveyorProfile('map-member', {
    username: 'map_member',
    fullName: 'Map Member',
    bankName: 'QA Bank',
    accountName: 'Map Member',
    accountNumber: '000123456789',
    consent: true,
  });
  await getDb()
    .prepare('INSERT INTO "user" VALUES (?, ?, ?)')
    .run('map-member', 'Map Member', 'map@example.test');
});
test.after(async () => {
  await closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});

test('the small pinned map has one finite geometry per province, including all six Papua-region provinces', () => {
  const raw = readFileSync(new URL('../src/data/indonesia-provinces.json', import.meta.url), 'utf8');
  const map = JSON.parse(raw);
  assert.ok(Buffer.byteLength(raw) < 60000);
  assert.equal(map.shapes.length, 38);
  assert.equal(provinces.length, 38);
  assert.deepEqual(
    map.shapes.map((shape: { id: string }) => shape.id).sort(),
    provinces.map((p) => p.id).sort(),
  );
  assert.equal(provinces.filter((p) => p.name.startsWith('Papua')).length, 6);
  for (const shape of map.shapes) {
    assert.match(shape.path, /^M[\d.,LZM]+Z$/);
    assert.ok(!shape.path.includes('NaN'));
  }
  assert.equal(map.license, 'CC BY 4.0');
  assert.ok(map.source.endsWith('80aa4a90ac7eef5136eaa2b551b6aa5d198be27d'));
});
test('coverage counts assignments separately from unique surveyors and retains unmapped/zero provinces', () => {
  const tasks = [
    { provinceId: 'jawa-barat', username: 'same', active: true },
    { provinceId: 'jawa-barat', username: 'same', active: true },
    { provinceId: 'jawa-barat', username: 'other', active: false },
    { provinceId: null, username: 'none', active: true },
    { provinceId: 'unsupported', username: 'invalid', active: true },
  ];
  const map = assignmentMap(tasks);
  const west = map.rows.find((row) => row.id === 'jawa-barat')!;
  assert.deepEqual([west.tasks, west.people, west.active], [3, 2, 2]);
  assert.deepEqual([map.covered, map.unmapped, map.total], [1, 2, 5]);
  assert.equal(map.rows.reduce((sum, row) => sum + row.tasks, 0) + map.unmapped, map.total);
  assert.equal(map.rows.find((row) => row.id === 'aceh')!.tasks, 0);
  assert.equal(assignmentMap([]).covered, 0);
});
test('map SSR exposes keyboard controls and honest empty counts, without profile/payout fields', () => {
  const html = renderToStaticMarkup(
    createElement(AssignmentMap, { assignments: [], selected: 'all', onSelect() {} }),
  );
  assert.equal((html.match(/<path\b[^>]*role="button"/g) ?? []).length, 38);
  assert.ok(html.includes('maks. 0'));
  assert.ok(!html.includes('NaN'));
  assert.ok(html.includes('Peta sebaran survei') && html.includes('tabindex="0"'));
  const assignment: ManagedSurveyorAssignment = {
    id: 'qa',
    username: 'private_username',
    fullName: 'Private Person',
    provinceId: 'jawa-barat',
    active: true,
    shareUrl: 'private-token',
    responseCount: 77,
    createdAt: '',
  };
  const filled = renderToStaticMarkup(
    createElement(AssignmentMap, { assignments: [assignment], selected: 'jawa-barat', onSelect() {} }),
  );
  assert.ok(filled.includes('Jawa Barat: 77 responden, 1 surveyor aktif, target belum diatur'));
  assert.ok(
    !filled.includes('private_username') &&
      !filled.includes('Private Person') &&
      !filled.includes('private-token'),
  );
});
test('response mapping keeps historical counts, active surveyors distinct and targets independent of submission limits', () => {
  const tasks = [
    { provinceId: 'jawa-barat', username: 'same', active: true, responseCount: 3 },
    { provinceId: 'jawa-barat', username: 'same', active: true, responseCount: 4 },
    { provinceId: 'jawa-barat', username: 'past', active: false, responseCount: 5 },
    { provinceId: null, username: 'unset', active: true, responseCount: 2 },
  ];
  const targets = [
    { provinceId: 'jawa-barat', target: 2 },
    { provinceId: 'jawa-barat', target: 3 },
    { provinceId: 'aceh', target: 10 },
  ];
  const map = assignmentMap(tasks, targets, 3);
  const west = map.rows.find((row) => row.id === 'jawa-barat')!;
  assert.deepEqual([west.respondents, west.activePeople, west.target], [12, 1, 5]);
  assert.deepEqual([map.respondents, map.people, map.unmappedRespondents, map.target], [17, 2, 5, 15]);
  assert.equal(assignmentMap(tasks).rows.find((row) => row.id === 'aceh')!.target, null);
  const html = renderToStaticMarkup(
    createElement(AssignmentMap, {
      assignments: [
        { ...tasks[0], responseCount: 12, id: 'qa', fullName: 'QA', shareUrl: 'private', createdAt: '' },
      ],
      targets: [{ provinceId: 'jawa-barat', target: 5 }],
      selected: 'jawa-barat',
      onSelect() {},
    }),
  );
  assert.ok(html.includes('240%') && html.includes('+7 dari target'));
  assert.ok(html.includes('aria-valuenow="100"') && html.includes('240 persen'));
  assert.ok(!html.includes('private'));
  const ownTask = renderToStaticMarkup(createElement(SurveyorTaskProgress, { responseCount: 7 }));
  assert.ok(ownTask.includes('>7</strong>') && ownTask.includes('Responden di survei ini'));
});
test('tooltip positions stay inside the frame at desktop and mobile edges', () => {
  for (const frame of [
    { width: 1000, height: 400 },
    { width: 300, height: 200 },
  ]) {
    for (const [x, y] of [
      [0, 0],
      [frame.width, 0],
      [0, frame.height],
      [frame.width, frame.height],
    ]) {
      const point = mapTooltipPosition(x, y, frame, { width: 248, height: 172 });
      assert.ok(point.x >= 0 && point.y >= 0);
      assert.ok(point.x + 248 <= frame.width && point.y + 172 <= frame.height);
    }
  }
});
test('targets and personal link totals stay survey/owner scoped, and exceeding a target accepts responses', async () => {
  const owner = 'target-owner';
  const open = async (title: string) => {
    const survey = await createSurvey(owner, title, 'blank');
    return updateSurvey(survey.id, owner, { ...survey, status: 'open', visibility: 'link', target: 1 });
  };
  const first = await open('First target survey');
  const second = await open('Second target survey');
  const hidden = await open('Not assigned to surveyor');
  const foreign = await createSurvey('foreign-target-owner', 'Foreign target', 'blank');
  const [one] = await assignSurveyor(first.id, owner, 'map_member', owner);
  const [two] = await assignSurveyor(second.id, owner, 'map_member', owner);
  await setAssignmentProvince(first.id, owner, one.id, 'jawa-barat', owner);
  await setAssignmentProvince(second.id, owner, two.id, 'jawa-barat', owner);
  await setProvinceTarget(first.id, owner, 'jawa-barat', 1, 'real-actor');
  await setProvinceTarget(second.id, owner, 'jawa-barat', 10, owner);
  await assert.rejects(setProvinceTarget(first.id, 'other-owner', 'jawa-barat', 20, 'other-owner'));
  for (const invalid of [0, -1, 1.5, Number.NaN, 10000001])
    await assert.rejects(setProvinceTarget(first.id, owner, 'jawa-barat', invalid, owner));
  await assert.rejects(setProvinceTarget(first.id, owner, 'invalid', 1, owner));
  for (const [survey, task, count] of [
    [first, one, 2],
    [second, two, 1],
  ] as const) {
    const referral = new URL(task.shareUrl).pathname.split('/').at(-1)!;
    for (let index = 0; index < count; index++) {
      const key = `${survey.id}-${index}`;
      await submitResponse(survey.token, { [survey.questions[0].id]: 'QA answer' }, key, referral);
      const duplicate = await submitResponse(
        survey.token,
        { [survey.questions[0].id]: 'QA answer' },
        key,
        referral,
      );
      assert.equal(duplicate.duplicate, true);
    }
  }
  const tasks = await listSurveyorAssignments('map-member');
  assert.equal(tasks.find((task) => task.surveyId === first.id)!.responseCount, 2);
  assert.equal(tasks.find((task) => task.surveyId === second.id)!.responseCount, 1);
  assert.ok(!tasks.some((task) => task.surveyId === hidden.id || task.surveyId === foreign.id));
  const groups = await listWorkspaceSurveyors(owner);
  assert.equal(groups.find((group) => group.surveyId === first.id)!.provinceTargets[0].target, 1);
  assert.equal(groups.find((group) => group.surveyId === second.id)!.provinceTargets[0].target, 10);
  assert.ok(!groups.some((group) => group.surveyId === foreign.id));
  assert.deepEqual(await listProvinceTargets(first.id, owner), [{ provinceId: 'jawa-barat', target: 1 }]);
  assert.equal(
    (
      await getDb()
        .prepare('SELECT updated_by FROM survey_province_targets WHERE survey_id = ?')
        .get(first.id)
    ).updated_by,
    'real-actor',
  );
  const before = (await listManagedSurveyors(first.id, owner))[0];
  await setProvinceTarget(first.id, owner, 'jawa-barat', 4, owner);
  await setProvinceTarget(first.id, owner, 'jawa-barat', null, owner);
  assert.deepEqual(await listProvinceTargets(first.id, owner), []);
  assert.equal((await listProvinceTargets(second.id, owner))[0].target, 10);
  const after = (await listManagedSurveyors(first.id, owner))[0];
  assert.deepEqual(after, before);
  await setAssignmentActive(first.id, owner, one.id, false, owner);
  assert.ok(!(await listSurveyorAssignments('map-member')).some((task) => task.surveyId === first.id));
  const roster = await listWorkspaceSurveyors(owner);
  assert.equal(
    assignmentMap(roster.find((group) => group.surveyId === first.id)!.assignments).rows.find(
      (row) => row.id === 'jawa-barat',
    )!.respondents,
    2,
  );
});
test('province changes are assignment/owner scoped, audited to the actor and preserve link/response data', async () => {
  let first = await createSurvey('map-owner', 'National mapping', 'blank');
  first = await updateSurvey(first.id, 'map-owner', { ...first, status: 'open', visibility: 'link' });
  const second = await createSurvey('map-owner', 'Second mapping', 'blank');
  const foreign = await createSurvey('foreign-owner', 'Foreign mapping', 'blank');
  const [assignment] = await assignSurveyor(first.id, 'map-owner', 'map_member', 'map-owner');
  await assignSurveyor(second.id, 'map-owner', 'map_member', 'map-owner');
  await assignSurveyor(foreign.id, 'foreign-owner', 'map_member', 'foreign-owner');
  assert.equal(assignment.provinceId, null);
  const token = new URL(assignment.shareUrl).pathname.split('/').at(-1)!;
  await submitResponse(first.token, { [first.questions[0].id]: 'Stored answer' }, 'map-request-key', token);
  const [changed] = await setAssignmentProvince(
    first.id,
    'map-owner',
    assignment.id,
    'jawa-barat',
    'actual-operator',
  );
  assert.equal(changed.provinceId, 'jawa-barat');
  assert.equal(changed.shareUrl, assignment.shareUrl);
  assert.equal(changed.active, true);
  assert.equal(changed.responseCount, 1);
  const record = await getDb()
    .prepare('SELECT * FROM surveyor_assignment_regions WHERE assignment_id = ?')
    .get(assignment.id);
  assert.equal(record.updated_by, 'actual-operator');
  await assert.rejects(
    setAssignmentProvince(first.id, 'foreign-owner', assignment.id, 'aceh', 'foreign-owner'),
  );
  await assert.rejects(setAssignmentProvince(second.id, 'map-owner', assignment.id, 'aceh', 'map-owner'));
  await assert.rejects(
    setAssignmentProvince(first.id, 'map-owner', assignment.id, 'fake-province', 'map-owner'),
  );
  assert.equal((await listManagedSurveyors(second.id, 'map-owner'))[0].provinceId, null);
  assert.equal((await listManagedSurveyors(foreign.id, 'foreign-owner'))[0].provinceId, null);
  assert.equal(
    (await listSurveyorAssignments('map-member')).find((task) => task.id === assignment.id)!.provinceId,
    'jawa-barat',
  );
  assert.equal((await listSubmissions(first.id))[0].answers[first.questions[0].id], 'Stored answer');
  await setAssignmentActive(first.id, 'map-owner', assignment.id, false, 'map-owner');
  const [restored] = await setAssignmentActive(first.id, 'map-owner', assignment.id, true, 'map-owner');
  assert.equal(restored.provinceId, 'jawa-barat');
  assert.notEqual(restored.shareUrl, assignment.shareUrl);
  const [cleared] = await setAssignmentProvince(
    first.id,
    'map-owner',
    assignment.id,
    null,
    'actual-operator',
  );
  assert.equal(cleared.provinceId, null);
  assert.equal(cleared.responseCount, 1);
  assert.equal(
    (
      await getDb()
        .prepare('SELECT count(*) AS count FROM surveyor_assignment_regions WHERE assignment_id = ?')
        .get(assignment.id)
    ).count,
    0,
  );
});
