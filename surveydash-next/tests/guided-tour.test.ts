import test from 'node:test';
import assert from 'node:assert/strict';
import { placeTourCard, tourAdvanceIndex, tourPlan } from '../src/lib/guided-tour';

test('manager tour follows real creation and editor actions without publishing or inviting automatically', () => {
  const plan = tourPlan('manager');
  assert.deepEqual(
    plan.map((step) => step.id),
    ['create', 'name', 'template', 'submit', 'questions', 'form', 'invite', 'data', 'analysis'],
  );
  assert.equal(tourAdvanceIndex(plan, 0, 'create-survey'), 1);
  assert.equal(tourAdvanceIndex(plan, 2, 'survey-template'), 3);
  assert.equal(plan[3].waitForCreate, true);
  assert.equal(plan[3].clickNext, undefined);
  assert.ok(plan.every((step) => !/publish|submit|invitation/.test(step.clickNext ?? '')));
});

test('only a successful creation advances the draft gate, including native Enter submission', () => {
  const plan = tourPlan('manager');
  for (const index of [1, 2, 3]) assert.equal(tourAdvanceIndex(plan, index, 'created'), 4);
  assert.equal(tourAdvanceIndex(plan, 3, 'survey-create-submit'), 3);
  assert.equal(tourAdvanceIndex(plan, 3, 'failed'), 3);
  assert.equal(tourAdvanceIndex(plan, 0, 'created'), 0);
  assert.equal(tourAdvanceIndex(plan, 4, 'created'), 4);
});

test('live editor clicks advance one matching step and unrelated navigation does not silently complete the tour', () => {
  const plan = tourPlan('manager');
  assert.equal(tourAdvanceIndex(plan, 4, 'editor-tab-form'), 5);
  assert.equal(tourAdvanceIndex(plan, 5, 'editor-tab-surveyors'), 6);
  assert.equal(tourAdvanceIndex(plan, 6, 'editor-tab-data'), 7);
  assert.equal(tourAdvanceIndex(plan, 7, 'editor-tab-analytics'), 8);
  assert.equal(tourAdvanceIndex(plan, 5, 'editor-tab-data'), 5);
});

test('surveyor without tasks receives a useful tour without missing preview or copy targets', () => {
  const plan = tourPlan('surveyor');
  assert.deepEqual(
    plan.map((step) => step.id),
    ['tasks', 'progress', 'profile'],
  );
  assert.ok(plan.every((step) => !step.clickNext));
});

test('surveyor task guide includes the read-only preview and only offers an enabled copy target', () => {
  assert.deepEqual(
    tourPlan('surveyor', true, false).map((step) => step.id),
    ['tasks', 'preview', 'progress', 'profile'],
  );
  const plan = tourPlan('surveyor', true, true);
  assert.deepEqual(
    plan.map((step) => step.id),
    ['tasks', 'preview', 'share', 'progress', 'profile'],
  );
  assert.equal(tourAdvanceIndex(plan, 0, 'surveyor-preview'), 1);
  assert.equal(plan[1].slot, 'preview');
  assert.equal(plan[2].clickNext, undefined, 'Next must not silently write to the clipboard');
});

test('coach placement uses room below, then above, and remains inside small viewports', () => {
  assert.equal(
    placeTourCard(
      { left: 100, top: 80, width: 150, height: 44 },
      { width: 340, height: 200 },
      { width: 1000, height: 800 },
    ).placement,
    'below',
  );
  assert.equal(
    placeTourCard(
      { left: 100, top: 650, width: 150, height: 44 },
      { width: 340, height: 200 },
      { width: 1000, height: 800 },
    ).placement,
    'above',
  );
  for (const width of [280, 320, 390, 768, 1440])
    for (const height of [240, 400, 800])
      for (const top of [-120, 50, 350, 900]) {
        const value = placeTourCard(
          { left: width - 30, top, width: 80, height: 100 },
          { width: 340, height: 230 },
          { width, height },
        );
        assert.ok(value.left >= 12 && value.left + value.width <= width - 12);
        assert.ok(value.top >= 12 && value.top + Math.min(230, height - 24) <= height - 12);
      }
});
