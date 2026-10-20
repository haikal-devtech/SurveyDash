import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listMotionFrames, type MotionBox } from '../src/lib/dashboard-motion';

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
