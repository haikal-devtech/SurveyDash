import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { closeDatabase, getDb } from '../src/lib/db';
import { createSurvey, editAnswer, submitResponse, updateSurvey } from '../src/lib/repository';
import { getSurveyInsights, exportResponseCsv } from '../src/lib/responses-repository';
import {
  answerFingerprint,
  detectCleaningFlags,
  maskAccount,
  normalizeAccount,
  normalizeIdentity,
  validateCleaningConfig,
} from '../src/lib/cleaning-model';
import {
  getCleaningPage,
  reviewCleaningSubmission,
  saveCleaningConfig,
} from '../src/lib/cleaning-repository';
import type { Question, Submission } from '../src/lib/types';

const directory = mkdtempSync(join(tmpdir(), 'studio-cleaning-'));
delete process.env.DATABASE_URL;
delete process.env.STAGING_DATABASE_URL;
delete process.env.VERCEL;
delete process.env.VERCEL_ENV;
process.env.STUDIO_DB_PATH = join(directory, 'test.sqlite');
const question = (id: string, type: Question['type']): Question => ({
  id,
  label: id,
  description: '',
  type,
  required: false,
  scored: false,
  options: [],
});
const questions: Question[] = [
  question('respondent-name', 'text'),
  {
    ...question('respondent-bank', 'choice'),
    options: [
      { id: 'b1', label: 'Bank Satu' },
      { id: 'b2', label: 'Bank Dua' },
    ],
  },
  question('respondent-account', 'text'),
  {
    ...question('opinion', 'choice'),
    options: [
      { id: 'good', label: 'Baik' },
      { id: 'bad', label: 'Kurang' },
    ],
  },
  {
    ...question('multiple', 'checkbox'),
    options: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
  },
  question('comment', 'textarea'),
];
const config = {
  nameQuestionId: 'respondent-name',
  bankQuestionId: 'respondent-bank',
  accountQuestionId: 'respondent-account',
};
const baseAnswers = {
  'respondent-name': ' Haikal  Pasha ',
  'respondent-bank': 'b1',
  'respondent-account': '00-123',
  opinion: 'good',
  multiple: ['a', 'b'],
  comment: 'Sangat membantu',
};
async function fixture(owner: string) {
  const created = await createSurvey(owner, 'Cleaning fixture ' + owner, 'blank');
  return updateSurvey(created.id, owner, { ...created, questions, status: 'open' });
}
function submission(id: string, answers: Submission['answers']): Submission {
  return {
    id,
    surveyId: 'pure-survey',
    answers,
    questionSnapshot: questions,
    revision: 1,
    submittedAt: '2026-10-19T00:00:00.000Z',
  };
}
test('identity mapping is explicit and accepts only appropriate distinct question types', () => {
  assert.deepEqual(validateCleaningConfig({ questions }, {}), {});
  assert.deepEqual(validateCleaningConfig({ questions }, config), config);
  assert.throws(() => validateCleaningConfig({ questions }, { nameQuestionId: 'unknown' }), /nama harus/);
  assert.throws(
    () => validateCleaningConfig({ questions }, { bankQuestionId: 'respondent-bank' }),
    /bersama/,
  );
  assert.throws(
    () =>
      validateCleaningConfig(
        { questions },
        { bankQuestionId: 'respondent-account', accountQuestionId: 'respondent-account' },
      ),
    /berbeda/,
  );
  assert.throws(
    () =>
      validateCleaningConfig(
        { questions: [...questions, question('numeric-account', 'number')] },
        { bankQuestionId: 'respondent-bank', accountQuestionId: 'numeric-account' },
      ),
    /angka nol/,
  );
});
test('normalization preserves account leading zeros and meaningful name differences', () => {
  assert.equal(normalizeIdentity('  HAIKAL\t Pasha '), 'haikal pasha');
  assert.equal(normalizeIdentity('ＨＡＩＫＡＬ'), 'haikal');
  assert.notEqual(normalizeIdentity('José'), normalizeIdentity('Jose'));
  assert.equal(normalizeAccount(' 00-123.45 '), '0012345');
  assert.notEqual(normalizeAccount('00123'), normalizeAccount('123'));
  assert.equal(maskAccount('00123'), '•••• 0123');
  assert.equal(maskAccount('123'), '••••');
  assert.equal(maskAccount(''), '—');
});
test('similarity flags group names/accounts/answers without grouping blanks or treating another bank as identical', () => {
  const first = submission('first', baseAnswers);
  const second = submission('second', {
    ...baseAnswers,
    'respondent-name': 'HAIKAL PASHA',
    'respondent-account': '00123',
    multiple: ['b', 'a'],
    comment: ' SANGAT membantu ',
  });
  const differentBank = submission('different-bank', {
    ...baseAnswers,
    'respondent-name': 'Orang Lain',
    'respondent-bank': 'b2',
  });
  const empty = submission('empty', {
    'respondent-name': '',
    'respondent-account': '',
    'respondent-bank': '',
    comment: '  ',
  });
  const result = detectCleaningFlags({ questions }, [first, second, differentBank, empty], config);
  assert.deepEqual(
    result.flags.get('first')?.map((flag) => flag.kind),
    ['name', 'account', 'answers'],
  );
  assert.equal(result.flags.get('first')?.find((flag) => flag.kind === 'answers')?.count, 3);
  assert.equal(result.flags.get('first')?.find((flag) => flag.kind === 'account')?.count, 2);
  assert.deepEqual(
    result.flags.get('different-bank')?.map((flag) => flag.kind),
    ['answers'],
  );
  assert.equal(result.flags.has('empty'), false);
  assert.equal(answerFingerprint({ questions }, empty, config), '');
  assert.equal(
    detectCleaningFlags({ questions: questions.slice(0, 3) }, [first, second], config)
      .flags.get('first')
      ?.some((flag) => flag.kind === 'answers'),
    false,
  );
});
test('large duplicate groups keep bounded peer samples while reporting the complete count', () => {
  const rows = Array.from({ length: 300 }, (_, index) => submission('row-' + index, baseAnswers));
  const flags = detectCleaningFlags({ questions }, rows, config).flags;
  assert.equal(flags.size, 300);
  for (const [id, entries] of flags)
    for (const entry of entries) {
      assert.equal(entry.count, 300);
      assert.equal(entry.sampleIds.length, 10);
      assert.equal(entry.sampleIds.includes(id), false);
    }
});
test('cleaning paging, focus comparison, masking and settings concurrency respect survey ownership', async () => {
  const survey = await fixture('clean-pages');
  const first = await submitResponse(survey.token, baseAnswers, 'first');
  const second = await submitResponse(
    survey.token,
    { ...baseAnswers, 'respondent-name': 'HAIKAL PASHA', 'respondent-account': '00123' },
    'second',
  );
  await submitResponse(survey.token, { opinion: 'bad', comment: 'Lain' }, 'third');
  const initial = await getCleaningPage(survey.id, survey.ownerId, { flaggedOnly: 'false' });
  assert.equal(initial.configUpdatedAt, null);
  assert.equal(initial.total, 3);
  const saved = await saveCleaningConfig(survey.id, survey.ownerId, {
    action: 'config',
    config,
    expectedUpdatedAt: null,
  });
  assert.ok(saved.configUpdatedAt);
  await assert.rejects(
    () =>
      saveCleaningConfig(survey.id, survey.ownerId, { action: 'config', config, expectedUpdatedAt: null }),
    /telah berubah/,
  );
  const page = await getCleaningPage(survey.id, survey.ownerId, { pageSize: 1, page: 999 });
  assert.equal(page.total, 3);
  assert.equal(page.flagged, 2);
  assert.equal(page.filtered, 2);
  assert.equal(page.page, 2);
  assert.equal(page.rows.length, 1);
  assert.ok(page.rows[0].accountMasked.startsWith('••••'));
  assert.equal('answers' in page.rows[0], false);
  assert.equal('comparison' in page.rows[0], false);
  const focus = await getCleaningPage(survey.id, survey.ownerId, { focus: first.id });
  assert.equal(focus.filtered, 2);
  assert.equal(focus.rows[0].id, first.id);
  assert.ok(focus.rows.some((row) => row.id === second.id));
  assert.equal(
    focus.rows[0].comparison?.find((answer) => answer.questionId === 'respondent-account')?.value,
    '•••• 0123',
  );
  await assert.rejects(() => getCleaningPage(survey.id, 'other-owner', {}), /tidak ditemukan/);
  await assert.rejects(
    () =>
      saveCleaningConfig(survey.id, 'other-owner', {
        action: 'config',
        config,
        expectedUpdatedAt: saved.configUpdatedAt,
      }),
    /tidak ditemukan/,
  );
  await assert.rejects(() => getCleaningPage(survey.id, survey.ownerId, { pageSize: 101 }));
  await assert.rejects(
    () => getCleaningPage(survey.id, survey.ownerId, { focus: 'unknown' }),
    /tidak ditemukan/,
  );
  const other = await fixture('other-survey');
  const otherResponse = await submitResponse(other.token, baseAnswers, 'other');
  await assert.rejects(
    () => getCleaningPage(survey.id, survey.ownerId, { focus: otherResponse.id }),
    /tidak ditemukan/,
  );
});
test('manual reviews are audited with actual actor and become stale after correction without changing analytics', async () => {
  const survey = await fixture('clean-review');
  const response = await submitResponse(survey.token, baseAnswers, 'review-response');
  const beforeStats = await getSurveyInsights(survey.id, survey.ownerId);
  const input = {
    action: 'review',
    submissionId: response.id,
    status: 'needs_verification',
    reason: 'Nama sama, menunggu verifikasi perusahaan.',
    revision: 1,
    expectedReviewedAt: null,
  };
  const saved = await reviewCleaningSubmission(survey.id, survey.ownerId, 'actual-admin-id', input);
  assert.equal(saved.status, 'needs_verification');
  assert.equal(saved.actor, 'actual-admin-id');
  assert.equal(saved.stale, false);
  await assert.rejects(
    () => reviewCleaningSubmission(survey.id, survey.ownerId, 'second-admin', input),
    /pengelola lain/,
  );
  const page = await getCleaningPage(survey.id, survey.ownerId, {
    flaggedOnly: 'false',
    status: 'needs_verification',
  });
  assert.equal(page.filtered, 1);
  assert.equal(page.audit.length, 1);
  assert.equal(page.audit[0].actor, 'actual-admin-id');
  assert.deepEqual((await getSurveyInsights(survey.id, survey.ownerId)).stats, beforeStats.stats);
  const csv = await exportResponseCsv(survey.id, survey.ownerId, {}, new AbortController().signal);
  assert.equal((await csv.text()).trim().split('\r\n').length, 2);
  const corrected = await editAnswer(
    survey.id,
    survey.ownerId,
    response.id,
    'respondent-name',
    'Responden berbeda',
    1,
    'correction-admin',
  );
  const stale = await getCleaningPage(survey.id, survey.ownerId, {
    flaggedOnly: 'false',
    status: 'unreviewed',
  });
  assert.equal(stale.filtered, 1);
  assert.equal(stale.rows[0].review?.stale, true);
  assert.equal(
    (await getCleaningPage(survey.id, survey.ownerId, { flaggedOnly: 'false', status: 'needs_verification' }))
      .filtered,
    0,
  );
  await assert.rejects(
    () =>
      reviewCleaningSubmission(survey.id, survey.ownerId, 'actual-admin-id', {
        ...input,
        expectedReviewedAt: saved.reviewedAt,
      }),
    /dikoreksi/,
  );
  const updated = await reviewCleaningSubmission(survey.id, survey.ownerId, 'reviewer-two', {
    ...input,
    status: 'valid',
    reason: 'Identitas berbeda telah diverifikasi.',
    revision: corrected.revision,
    expectedReviewedAt: saved.reviewedAt,
  });
  assert.equal(updated.status, 'valid');
  assert.equal(updated.stale, false);
  const final = await getCleaningPage(survey.id, survey.ownerId, { flaggedOnly: 'false' });
  assert.equal(final.audit.length, 2);
  assert.equal(final.audit[0].actor, 'reviewer-two');
  assert.equal(final.rows[0].review?.stale, false);
  assert.equal(
    (await getDb().prepare('SELECT count(*) AS total FROM audit WHERE survey_id = ?').get(survey.id)).total,
    1,
  );
  await assert.rejects(
    () =>
      reviewCleaningSubmission(survey.id, 'unrelated-owner', 'attacker', {
        ...input,
        revision: 2,
        expectedReviewedAt: updated.reviewedAt,
      }),
    /tidak ditemukan/,
  );
  await assert.rejects(
    () =>
      reviewCleaningSubmission(survey.id, survey.ownerId, 'reviewer-two', {
        ...input,
        submissionId: 'unknown',
      }),
    /tidak ditemukan/,
  );
});
test.after(async () => {
  await closeDatabase();
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  rmSync(directory, { recursive: true, force: true });
});
