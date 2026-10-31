// rd9: lyric markers in reused Full sections follow the target section's own beats (Noff rd8 Medium).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { upFullSecs } from "../../js/songs/fullchart.js";
const anh = JSON.parse(readFileSync(new URL("../fixtures/upload/anh-v12.json", import.meta.url))).songs[0];
const offs = ch => { let t = 0; return ch.map(c => { const o = [t, t + c.durationBeats]; t += c.durationBeats; return o; }); };

test("rd9: every lyric marker of a reused section lands on the Full chord at its own beat (rd7 timing)", () => {
  const m = upFullSecs(anh.sectionsFull, anh.sections, 4);
  const reused = m.filter(s => s.reusedFrom);
  assert.deepEqual(reused.map(s => s.id), ["verse2a", "verse2b", "chorus2", "solo", "verse3"]);
  let n = 0;
  for (const s of reused) {
    const e = anh.sections.find(x => x.id === s.id), eo = offs(e.chords), fo = offs(s.chords);
    assert.equal((s.lyrics || []).length, (e.lyrics || []).length, s.id);
    (e.lyrics || []).forEach((ln, li) => {
      const got = s.lyrics[li];
      assert.equal(got.text, ln.text);
      // every easy marker keeps a marker (two chords on one line keep both) unless two easy chords share one Full chord
      const want = []; ln.markers.forEach(mk => { const t = eo[mk.chordIndex][0]; const k = fo.findIndex(([a, b]) => a <= t && t < b); if (!want.some(w => w.chordIndex === k)) want.push({ charIndex: mk.charIndex, chordIndex: k }); });
      assert.deepEqual(got.markers, want, `${s.id} line ${li}`);
      for (const mk of got.markers) n++;
      // rd7 timing: the marker's beat (rd7 = the easy chord's start) is the Full chord's start
      ln.markers.forEach((mk, j) => { const g = got.markers[j]; if (g) assert.equal(fo[g.chordIndex][0], eo[mk.chordIndex][0], `${s.id} line ${li} marker ${j}`); });
    });
    // never all on the last chord
    const last = s.chords.length - 1, all = s.lyrics.flatMap(l => l.markers);
    if (all.length > 1) assert.ok(all.some(x => x.chordIndex !== last), s.id);
  }
  assert.ok(n > 20, `${n} markers checked`);
});
