// Uncommitted cleanup: eight border slots use the chord's real step numbers, in order.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BADGE_SLOTS, badgeCenter, badgeInset } from '../../js/ui/badgeslots.js';

const box = { left: 100, top: 200, width: 80, height: 40 };

test('slots are TL TR BR BL TC RC BC LC', () => {
  assert.deepEqual(BADGE_SLOTS, ['tl', 'tr', 'br', 'bl', 'tc', 'rc', 'bc', 'lc']);
});

test('steps 1, 5 and 9 land on TL, TR, BR when they are the 1st, 2nd and 3rd time that chord plays', () => {
  const centers = [0, 1, 2].map(ord => badgeCenter(box, ord, 16, 16));
  assert.deepEqual(centers.map(c => c.slot), ['tl', 'tr', 'br']);
  assert.equal(centers[0].x, 100);
  assert.equal(centers[0].y, 200);
  assert.equal(centers[1].x, 180);
  assert.equal(centers[1].y, 200);
  assert.equal(centers[2].x, 180);
  assert.equal(centers[2].y, 240);
});

test('eight appearances use all eight border points and stay on the border', () => {
  const want = [[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
  want.forEach((xy, ord) => {
    const c = badgeCenter(box, ord, 16, 16);
    assert.equal(c.slot, BADGE_SLOTS[ord]);
    assert.equal(c.ring, 0);
    assert.ok(Math.abs((c.x - box.left) / box.width - xy[0]) < 1e-9);
    assert.ok(Math.abs((c.y - box.top) / box.height - xy[1]) < 1e-9);
  });
});

test('a 15px badge on a 4px gutter slides inward and a badge that already fits stays put', () => {
  const narrow = { left: 0, top: 0, width: 43.7, height: 42 };
  const tl = badgeCenter(narrow, 0, 15, 15);
  const slid = badgeInset(tl, narrow, 15, 15, 4);
  assert.ok(slid.x > tl.x);
  assert.equal(slid.y, tl.y);
  assert.ok(slid.x - 7.5 >= narrow.left - 2 - 1e-9);
  const tc = badgeCenter(narrow, 4, 15, 15);
  const mid = badgeInset(tc, narrow, 15, 15, 4);
  assert.equal(mid.x, tc.x);
  const wide = { left: 0, top: 0, width: 64, height: 34 };
  const edge = badgeCenter(wide, 0, 16, 16);
  const kept = badgeInset(edge, wide, 16, 16, 20);
  assert.equal(kept.x, edge.x);
});

test('a 9th step keeps its own index and moves outward instead of being dropped or renumbered', () => {
  const ninth = badgeCenter(box, 8, 16, 16);
  const first = badgeCenter(box, 0, 16, 16);
  assert.equal(ninth.slot, 'over');
  assert.equal(ninth.anchor, 'tl');
  assert.equal(ninth.ring, 1);
  assert.ok(ninth.x !== first.x || ninth.y !== first.y);
});
