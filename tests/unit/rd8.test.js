// rd8: a partial Full chart reuses the Full voicings of a matching section (Noff rd7 #3).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { upFullSecs } from "../../js/songs/fullchart.js";
const beats = L => L.reduce((a, s) => a + s.chords.reduce((b, c) => b + c.durationBeats, 0) * (s.repeat || 1), 0);
const anh = JSON.parse(readFileSync(new URL("../fixtures/upload/anh-v12.json", import.meta.url))).songs[0];
const sec = (id, type, chords, extra) => Object.assign({ id, type, chords: chords.map(([chord, d]) => ({ chord, durationBeats: d })) }, extra || {});

test("rd8: Anh Da On Hon v1.2 plays Full voicings everywhere, same length and order", () => {
  const m = upFullSecs(anh.sectionsFull, anh.sections, 4);
  assert.equal(beats(m), beats(anh.sections));
  assert.deepEqual(m.map(s => s.id), ["intro", "verse", "chorus", "verse2a", "verse2b", "chorus2", "solo", "verse3"]);
  assert.deepEqual(m.map(s => s.reusedFrom || ""), ["", "", "", "verse", "verse", "chorus", "intro", "verse"]);
  const fv = anh.sectionsFull[1].chords.map(c => c.chord);
  for (const i of [3, 4, 7]) assert.deepEqual(m[i].chords.map(c => c.chord), fv);
  // the reused verse keeps that verse's own lyrics (not the Full verse's 27 lines)
  assert.equal(m[3].lyrics.length, anh.sections[4].lyrics.length);
  assert.equal(m[3].lyrics[0].text, anh.sections[4].lyrics[0].text);
  assert.equal(m.reduce((a, s) => a + s.chords.length * (s.repeat || 1), 0), 74);
});
test("rd8: different chords -> the easy section; same type preferred; any type when the chords are the same", () => {
  const easy = [sec("v1", "verse", [["C", 4], ["G", 4]]), sec("c1", "chorus", [["F", 4], ["G", 4]]), sec("v2", "verse", [["C", 4], ["Am", 4]]),
    sec("solo", "solo", [["C", 4], ["G", 4]]), sec("v3", "verse", [["C", 4], ["G", 4]])];
  const full = [sec("v", "verse", [["Cmaj7", 4], ["G7", 4]]), sec("c", "chorus", [["Fmaj7", 4], ["G9", 4]])];
  const m = upFullSecs(full, easy, 4);
  assert.deepEqual(m.map(s => s.chords.map(c => c.chord).join(" ")), ["Cmaj7 G7", "Fmaj7 G9", "C Am", "Cmaj7 G7", "Cmaj7 G7"]);
  assert.deepEqual(m.map(s => s.id), ["v", "c", "v2", "solo", "v3"]);   // placed Full sections keep their own ids (as rd7)
  assert.equal(beats(m), beats(easy));
});
test("rd8: same chords but a different repeat count is not reused", () => {
  const easy = [sec("v1", "verse", [["C", 4]]), sec("v2", "verse", [["C", 4]], { repeat: 2 }), sec("e", "outro", [["G", 4]])];
  const full = [sec("v", "verse", [["Cmaj7", 4]])];
  const m = upFullSecs(full, easy, 4);
  assert.deepEqual(m.map(s => s.chords[0].chord), ["Cmaj7", "C", "G"]);
});
