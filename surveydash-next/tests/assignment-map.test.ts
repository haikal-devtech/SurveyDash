import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { provinces } from '../src/lib/provinces';
import { assignmentMap } from '../src/lib/assignment-map';
import { AssignmentMap } from '../src/components/assignment-map';
import { createSurveyorProfile } from '../src/lib/account-repository';
import { closeDatabase, getDb } from '../src/lib/db';
import { createSurvey, updateSurvey, submitResponse, listSubmissions } from '../src/lib/repository';
import {
  assignSurveyor,
  listManagedSurveyors,
  listSurveyorAssignments,
  setAssignmentProvince,
  setAssignmentActive,
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
  assert.ok(html.includes('Peta wilayah tugas') && html.includes('tabindex="0"'));
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
  assert.ok(filled.includes('Jawa Barat: 1 penugasan, 1 surveyor'));
  assert.ok(
    !filled.includes('private_username') &&
      !filled.includes('Private Person') &&
      !filled.includes('private-token'),
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
    (await getDb().prepare('SELECT count(*) AS count FROM surveyor_assignment_regions').get()).count,
    0,
  );
});
