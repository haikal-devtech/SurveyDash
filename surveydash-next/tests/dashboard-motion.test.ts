import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listMotionFrames, sceneMotion, type MotionBox } from '../src/lib/dashboard-motion';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataChart } from '../src/components/data-chart';
import { DashboardMotionProvider } from '../src/components/dashboard-motion-context';

const box: MotionBox = { left: 10, top: 20, width: 300, height: 64 };
test('list motion preserves a surviving item position without scaling its text', () => {
  assert.deepEqual(listMotionFrames(box, { ...box, top: 84 }), [
    { transform: 'translate(0px, -64px)' },
    { transform: 'none' },
  ]);
});
test('new list items arrive in place while removed items need no retained DOM', () => {
  assert.deepEqual(listMotionFrames(undefined, box), [
    { opacity: 0, transform: 'translateY(6px)' },
    { opacity: 1, transform: 'none' },
  ]);
});
test('reduced motion skips spatial effects for new and surviving records', () => {
  assert.equal(listMotionFrames(undefined, box, true), null);
  assert.equal(listMotionFrames(box, { ...box, top: 90 }, true), null);
});
test('long moves across a changed layout use an in-place fade', () => {
  assert.deepEqual(listMotionFrames(box, { ...box, left: 600 }), [{ opacity: 0.35 }, { opacity: 1 }]);
});
test('unchanged or subpixel-stable records do not flicker or restart an animation', () => {
  assert.equal(listMotionFrames(box, box), null);
  assert.equal(listMotionFrames(box, { ...box, top: 20.2 }), null);
});
test('hidden or invalid destination boxes cannot generate broken transforms', () => {
  assert.equal(listMotionFrames(box, { ...box, width: 0 }), null);
  assert.equal(listMotionFrames(box, { ...box, left: NaN }), null);
});

test('scene timing is bounded for large dashboards and shorter on mobile', () => {
  const desktop = sceneMotion(1000)!;
  const mobile = sceneMotion(1000, true)!;
  assert.ok(desktop.options.duration + desktop.options.delay < 500);
  assert.ok(mobile.options.duration + mobile.options.delay < 350);
  assert.equal(sceneMotion(-1)!.options.delay, 0);
  assert.equal(sceneMotion(NaN)!.options.delay, 0);
  assert.equal(sceneMotion(2, false, true), null);
});

test('chart motion is opt-in for dashboards and never changes stored values or slide rendering', () => {
  const props = { type: 'column' as const, data: [{ name: 'Actual answer', count: 17 }] };
  const plain = renderToStaticMarkup(createElement(DataChart, props));
  const dashboard = renderToStaticMarkup(
    createElement(DashboardMotionProvider, { children: createElement(DataChart, props) }),
  );
  const slide = renderToStaticMarkup(
    createElement(DashboardMotionProvider, {
      children: createElement(DataChart, { ...props, variant: 'slide' }),
    }),
  );
  assert.ok(!plain.includes('data-chart-motion'));
  assert.ok(dashboard.includes('data-chart-motion'));
  assert.ok(!slide.includes('data-chart-motion'));
  for (const html of [plain, dashboard, slide]) {
    assert.ok(html.includes('Actual answer: 17 jawaban'));
    assert.ok(html.includes('>17</text>'));
    assert.ok(!html.includes('opacity:0'));
  }
});
