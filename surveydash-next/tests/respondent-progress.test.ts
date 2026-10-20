import assert from 'node:assert/strict';
import { test } from 'node:test';
import { respondentProgress } from '../src/lib/respondent-progress';

test('respondent progress counts actual answers and keeps optional questions optional', () => {
  assert.deepEqual(
    respondentProgress(
      [
        { id: 'a', required: true },
        { id: 'b', required: false },
      ],
      { a: 'yes' },
    ),
    { total: 2, answered: 1, required: 1, remainingRequired: 0, missing: [] },
  );
});
test('a numeric zero is a completed answer', () => {
  assert.equal(respondentProgress([{ id: 'a', required: true }], { a: 0 }).remainingRequired, 0);
});
test('blank text and an empty checkbox group stay incomplete in question order', () => {
  assert.deepEqual(
    respondentProgress(
      [
        { id: 'b', required: true },
        { id: 'a', required: true },
      ],
      { a: [], b: '  ' },
    ).missing,
    ['b', 'a'],
  );
});
test('unrelated answer keys never inflate completion and zero-question forms stay finite', () => {
  assert.equal(respondentProgress([{ id: 'a', required: true }], { unknown: 'value' }).answered, 0);
  assert.deepEqual(respondentProgress([], {}), {
    total: 0,
    answered: 0,
    required: 0,
    remainingRequired: 0,
    missing: [],
  });
});
