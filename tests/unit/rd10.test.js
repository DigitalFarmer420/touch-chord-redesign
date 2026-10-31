// rd10: a repeated Full section shows each pass's own lyrics, taken from the easy chart (Noff rd9 Low).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { upFullSecs, secLyrics } from "../../js/songs/fullchart.js";
const anh = JSON.parse(readFileSync(new URL("../fixtures/upload/anh-v12.json", import.meta.url))).songs[0];
// the same line rule as js/ui/lyrics.js upLineOf (first line with a marker on the chord, else the last one before it)
function lineOf(L, ci) { let r = -1; for (let i = 0; i < L.length; i++) if (L[i].markers.some(m => m.chordIndex === ci)) return i; for (let i = 0; i < L.length; i++) if (L[i].markers.some(m => m.chordIndex <= ci)) r = i; return r; }
function timeline(secs) { const out = []; let t = 0; secs.forEach(s => { for (let r = 0; r < (s.repeat || 1); r++) s.chords.forEach((c, ci) => { const L = secLyrics(s, r), li = lineOf(L, ci); out.push({ t, id: s.id, line: li >= 0 ? L[li].text : null }); t += c.durationBeats; }); }); return out; }

test("rd10: the v1.2 file stacks every verse's lines on the one repeated Full verse (the file is ambiguous)", () => {
  const v = anh.sectionsFull.find(s => s.id === "verse");
  assert.equal(v.repeat, 2);
  assert.equal(v.lyrics.length, 27);   // verse1a + verse1b + verse2a + verse2b + verse3, all on chords 0-7, no pass
});
test("rd10: each pass of the Full verse has the easy chart's lines for its bars", () => {
  const m = upFullSecs(anh.sectionsFull, anh.sections, 4), v = m.find(s => s.id === "verse");
  assert.equal(v.passLyrics.length, 2);
  assert.deepEqual(v.passLyrics[0].map(l => l.text), anh.sections.find(s => s.id === "verse1a").lyrics.map(l => l.text));
  assert.deepEqual(v.passLyrics[1].map(l => l.text), anh.sections.find(s => s.id === "verse1b").lyrics.map(l => l.text));
  assert.ok(v.passLyrics[1].some(l => l.text.startsWith("Nếu như ta không gặp nhau")));
  // markers: same chord index as the easy chart (both 8 chords of 4 beats)
  v.passLyrics[1].forEach((l, i) => assert.deepEqual(l.markers.map(x => x.chordIndex), anh.sections.find(s => s.id === "verse1b").lyrics[i].markers.map(x => x.chordIndex)));
  // the stored answer is untouched
  assert.equal(anh.sectionsFull.find(s => s.id === "verse").lyrics.length, 27);
});
test("rd10: every Expert step of v1.2 shows Simple's line at the same beat", () => {
  const E = timeline(upFullSecs(anh.sectionsFull, anh.sections, 4)), S = timeline(anh.sections);
  assert.equal(E.length, 74);
  const bad = [];
  E.forEach((e, i) => { let k = -1; S.forEach((s, j) => { if (s.t <= e.t + 1e-6) k = j; }); if (S[k].line !== e.line) bad.push(`${i}@${e.t} ${e.line} / ${S[k].line}`); });
  assert.deepEqual(bad, []);
});
test("rd10: a one-pass section and a section the easy chart cannot tile keep their own lyrics", () => {
  const full = [{ id: "a", repeat: 2, chords: [{ chord: "C", durationBeats: 8 }], lyrics: [{ text: "own", markers: [{ charIndex: 0, chordIndex: 0 }] }] }];
  const easy = [{ id: "a1", chords: [{ chord: "C", durationBeats: 12 }], lyrics: [{ text: "x", markers: [{ charIndex: 0, chordIndex: 0 }] }] }, { id: "a2", chords: [{ chord: "C", durationBeats: 4 }] }];
  const m = upFullSecs(full, easy, 4);
  assert.equal(m[0].passLyrics, undefined);
  assert.equal(secLyrics(m[0], 1)[0].text, "own");
});
