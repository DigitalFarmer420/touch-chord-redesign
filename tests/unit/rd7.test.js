// rd7: a partial Full chart (v1.2, Noff rd6 #3) is filled in per section with the easy chart; a complete one is unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { upFullSecs, upFullLyrics } from "../../js/songs/fullchart.js";
const beats = L => L.reduce((a, s) => a + s.chords.reduce((b, c) => b + c.durationBeats, 0) * (s.repeat || 1), 0);
const steps = L => L.reduce((a, s) => a + s.chords.length * (s.repeat || 1), 0);
const anh = JSON.parse(readFileSync(new URL("../fixtures/upload/anh-v12.json", import.meta.url))).songs[0];

test("rd7: partial Full chart plays the whole song (Full where it exists, else the easy section)", () => {
  const full = anh.sectionsFull, easy = anh.sections, bpb = 4;
  assert.ok(beats(full) < beats(easy));
  const m = upFullSecs(full, easy, bpb);
  assert.equal(beats(m), beats(easy));
  assert.deepEqual(m.map(s => s.id), ["intro", "verse", "chorus", "verse2a", "verse2b", "chorus2", "solo", "verse3"]);
  assert.ok(steps(m) > 33, `steps ${steps(m)}`);
  assert.equal(m[1].chords, full[1].chords);   // the Full verse's own chords
  assert.equal(m[3].id, 'verse2a');           // rd8: verse2a keeps its place (now with the Full verse's voicings)
});
test("rd7: a complete Full chart is used as it is", () => {
  const easy = [{ id: "a", chords: [{ chord: "C", durationBeats: 4 }] }, { id: "b", chords: [{ chord: "G", durationBeats: 4 }] }];
  const full = [{ id: "a", chords: [{ chord: "Cmaj7", durationBeats: 4 }], lyrics: [{ text: "x", markers: [] }] }, { id: "b", chords: [{ chord: "G7", durationBeats: 4 }], lyrics: [{ text: "y", markers: [] }] }];
  assert.deepEqual(upFullSecs(full, easy, 4), upFullLyrics(full, easy, 4));
  assert.deepEqual(upFullSecs(full, easy, 4).map(s => s.chords[0].chord), ["Cmaj7", "G7"]);
});
test("rd7: a Full section that starts off an easy section boundary is not used", () => {
  const easy = [{ id: "a", chords: [{ chord: "C", durationBeats: 8 }] }, { id: "b", chords: [{ chord: "G", durationBeats: 8 }] }];
  const full = [{ id: "x", chords: [{ chord: "Am", durationBeats: 4 }] }];   // 4 beats < 16: partial; starts at 0 = a
  const m = upFullSecs(full, easy, 4);
  assert.deepEqual(m.map(s => s.chords[0].chord), ["Am", "G"]);
});
