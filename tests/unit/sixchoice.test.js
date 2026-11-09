import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../../js/songs/presets.js", import.meta.url), "utf8");
const REV = JSON.parse(readFileSync(new URL("../fixtures/six-choice-review.json", import.meta.url), "utf8"));
const ADULT = ["pop", "jazz", "rnb", "ballad", "reggae", "funk", "yogaDeep", "country"];
const EXPECT = {
  pop: { major: 6, minor: 6 }, jazz: { major: 6, minor: 4 }, rnb: { major: 6, minor: 6 },
  ballad: { major: 6, minor: 6 }, reggae: { major: 6, minor: 6 }, funk: { major: 6, minor: 6 },
  yogaDeep: { major: 6, minor: 6 }, country: { major: 4, minor: 4 }
};

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
function menu() {
  const at = SRC.indexOf("var PROG_MENU = {");
  let i = SRC.indexOf("{", at), depth = 0, end = -1;
  for (let j = i; j < SRC.length; j++) {
    if (SRC[j] === "{") depth++;
    else if (SRC[j] === "}") { depth--; if (depth === 0) { end = j; break; } }
  }
  return eval("(" + SRC.slice(i, end + 1) + ")");
}
function visible(data, style, mode) {
  const full = data[style][mode];
  const by = {};
  full.forEach((p) => { by[p.name] = p; });
  return menu()[style].map((name) => by[name]).filter(Boolean);
}

const data = catalog();
const byItem = {};
REV.items.forEach((it) => { byItem[it.style + "\0" + it.name] = it; });

test("review file is the authoritative selection", () => {
  assert.equal(REV.selected.pop.length + REV.selected.jazz.length + REV.selected.rnb.length + REV.selected.ballad.length + REV.selected.reggae.length + REV.selected.funk.length + REV.selected.yogaDeep.length + REV.selected.country.length, 48);
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

test("rendered menu is the reviewed families and supported modes only", () => {
  assert.deepEqual(menu(), REV.selected);
  let entries = 0;
  for (const style of ADULT) {
    for (const mode of ["major", "minor"]) {
      const rows = visible(data, style, mode);
      assert.equal(rows.length, EXPECT[style][mode], style + " " + mode + " " + rows.map((p) => p.name).join(","));
      assert.ok(rows.length <= 6);
      const names = new Set(rows.map((p) => p.name));
      assert.equal(names.size, rows.length);
      for (const p of rows) {
        const it = byItem[style + "\0" + p.name];
        assert.equal(it.decision, "Keep");
        assert.ok(it.modes[mode]);
      }
      entries += rows.length;
    }
  }
  assert.equal(entries, 90);
});

test("source-array indexes of kept charts are not renumbered", () => {
  for (const style of ADULT) {
    for (const mode of ["major", "minor"]) {
      const full = data[style][mode];
      for (const name of REV.selected[style]) {
        const it = byItem[style + "\0" + name];
        if (!it.modes[mode]) continue;
        const idx = full.findIndex((p) => p.name === name);
        assert.ok(idx >= 0);
        assert.equal(full[idx].steps, it.modes[mode]);
      }
    }
  }
});
