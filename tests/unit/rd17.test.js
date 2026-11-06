// rd17: the Kids song grid row plan (js/kids/grid.js). Every card shows at its usual height when they all fit; a longer
// list fills the view with whole rows and lets the next row peek in by about a third of a card (25-40%), never below the
// smallest card that holds the picture + title.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const V = readFileSync(new URL('../../js/version.js', import.meta.url), 'utf8').match(/APP_VERSION = "([^"]+)"/)[1];
const { kidsRowPlan, KIDS_ROWS, PEEK } = await import(`../../js/kids/grid.js?v=${V}`);
// [layout, view height below the first row's top, columns, gap] at the rd17 sizes (measured in the app)
const SIZES = { '360x780': ['phone-port', 684, 2, 12], '384x832': ['phone-port', 736, 2, 12], '412x915': ['phone-port', 819, 2, 12],
  '780x360': ['phone-land', 286, 3, 10], '820x1180': ['pad-port', 1080, 3, 20], '1180x820': ['pad-land', 720, 3, 20] };
test('six cards: all fit at the usual height (no peek, nothing hidden)', () => {
  for (const [k, [lay, H, cols, g]] of Object.entries(SIZES)) {
    const p = kidsRowPlan(H, 6, cols, g, KIDS_ROWS[lay]);
    assert.equal(p.peek, 0, k); assert.equal(p.full, Math.ceil(6 / cols), k); assert.ok(p.r >= KIDS_ROWS[lay].lo, k);
  }
});
test('long lists (8 to 24 songs): whole rows + a 25-40% peek of the next row, cards within lo..hi', () => {
  for (const n of [8, 10, 12, 16, 20, 24]) for (const [k, [lay, H, cols, g]] of Object.entries(SIZES)) {
    const p = kidsRowPlan(H, n, cols, g, KIDS_ROWS[lay]), rows = Math.ceil(n / cols);
    if (p.peek === 0) { assert.ok(rows * p.r + (rows - 1) * g <= H + 0.5, `${k} n=${n}: said all fit`); continue; }
    assert.ok(p.peek >= 0.25 && p.peek <= 0.4, `${k} n=${n}: peek ${p.peek}`);
    assert.ok(p.r >= KIDS_ROWS[lay].lo && p.r <= KIDS_ROWS[lay].hi, `${k} n=${n}: row ${p.r}`);
    assert.ok(p.full >= 1 && p.full < rows, `${k} n=${n}: full ${p.full}`);
  }
});
test('20 songs scroll at every rd17 size', () => {
  for (const [k, [lay, H, cols, g]] of Object.entries(SIZES)) assert.ok(kidsRowPlan(H, 20, cols, g, KIDS_ROWS[lay]).peek > 0, k);
  assert.ok(PEEK > 0.25 && PEEK < 0.4);
});
