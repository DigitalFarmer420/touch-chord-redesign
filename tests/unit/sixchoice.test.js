import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../../js/songs/presets.js", import.meta.url), "utf8");
const REV = JSON.parse(readFileSync(new URL("../fixtures/six-choice-review.json", import.meta.url), "utf8"));
const V2 = JSON.parse(readFileSync(new URL("../fixtures/held-17-v2.json", import.meta.url), "utf8"));
const ADULT = ["pop", "jazz", "rnb", "ballad", "reggae", "funk", "yogaDeep", "country"];

function catalog() {
  const at = SRC.indexOf("PROGRESSIONS = {");
  let i = SRC.indexOf("{", at), depth = 0, end = -1;
  for (let j = i; j < SRC.length; j++) {
    if (SRC[j] === "{") depth++;
    else if (SRC[j] === "}") { depth--; if (depth === 0) { end = j; break; } }
  }
  const P = (name, steps) => ({ name, steps });
  return eval("(" + SRC.slice(i, end + 1) + ")");
}
function grab(mark) {
  const at = SRC.indexOf(mark);
  let i = SRC.indexOf("{", at), depth = 0, end = -1;
  for (let j = i; j < SRC.length; j++) {
    if (SRC[j] === "{") depth++;
    else if (SRC[j] === "}") { depth--; if (depth === 0) { end = j; break; } }
  }
  return eval("(" + SRC.slice(i, end + 1) + ")");
}
function menu() { return grab("var PROG_MENU = {"); }
function ovr() { return grab("var PROG_OVR = {"); }
function visible(data, style, mode) {
  const full = data[style][mode];
  const by = {};
  full.forEach((p) => { by[p.name] = p; });
  const over = (ovr()[style] && ovr()[style][mode]) || {};
  return menu()[style].map((name) => {
    const src = by[name];
    if (!src) return null;
    if (over[name]) return { name: src.name, steps: over[name] };
    return { name: src.name, steps: src.steps };
  }).filter(Boolean);
}

const data = catalog();
const byItem = {};
REV.items.forEach((it) => { byItem[it.style + "\0" + it.name] = it; });

test("the old review remains a catalog record, not the menu", () => {
  assert.equal(REV.items.length, 74);
  assert.equal(REV.items.filter((it) => it.decision === "Keep").length, 48);
});

test("full catalog stays underneath the menu", () => {
  let n = 0;
  for (const s of ADULT) for (const m of ["major", "minor"]) n += data[s][m].length;
  assert.equal(n, 137);
  assert.deepEqual(data.kids.major.map((p) => p.name), [
    "Kids Twinkle", "Kids Old MacDonald", "Kids Itsy Bitsy Spider", "Kids Row Your Boat",
    "Kids Head Shoulders Knees and Toes", "Kids Mary's Lamb"
  ]);
  assert.equal(data.kids.minor.length, 0);
  for (const it of REV.items) {
    for (const [mode, steps] of Object.entries(it.modes)) {
      const hit = data[it.style][mode].filter((p) => p.name === it.name);
      assert.equal(hit.length, 1, it.name + " " + mode);
      assert.equal(hit[0].steps, steps);
    }
  }
});

test("rendered menu is the 17-family v2 set and its 33 charts", () => {
  let entries = 0;
  const families = new Set();
  for (const style of ADULT) {
    assert.deepEqual(menu()[style], [...new Set([].concat(V2.progressions[style].major, V2.progressions[style].minor).map((p) => p.name))]);
    for (const mode of ["major", "minor"]) {
      const want = V2.progressions[style][mode];
      const rows = visible(data, style, mode);
      assert.deepEqual(rows.map((p) => p.name), want.map((p) => p.name), style + " " + mode);
      assert.ok(rows.length <= 6, style + " " + mode);
      rows.forEach((p, i) => {
        assert.equal(p.steps, want[i].steps, p.name + " " + mode);
        const n = want[i].steps.split("|").length;
        assert.ok(n >= 4 && n <= 8, p.name + " steps " + n);
        families.add(p.name);
      });
      entries += rows.length;
    }
  }
  assert.equal(entries, 33);
  assert.equal(families.size, 17);
  assert.equal(visible(data, "jazz", "minor").some((p) => p.name === "Jazz Chain"), false);
  const leaves = visible(data, "jazz", "major").find((p) => p.name === "Jazz Leaves");
  assert.equal(leaves.steps.split("|").length, 7);
  assert.equal(leaves.steps.endsWith("6 m7 x2"), true);
  const moon = visible(data, "yogaDeep", "major").find((p) => p.name === "Yoga Moon");
  assert.equal(moon.steps.split("|").every((s) => s.endsWith("x2")), true);
});

test("revised menu copies do not replace the source sequences", () => {
  for (const style of ADULT) {
    for (const mode of ["major", "minor"]) {
      for (const it of V2.progressions[style][mode]) {
        const hit = data[style][mode].find((p) => p.name === it.name);
        assert.ok(hit, it.name);
        assert.equal(hit.steps, it.originalSteps, it.name + " source");
      }
    }
  }
});
