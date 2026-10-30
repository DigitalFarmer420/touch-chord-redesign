import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Kids song data check, read from the app's own preset source (no DOM needed).
const SRC = readFileSync(new URL('../../js/songs/presets.js', import.meta.url), 'utf8');
const KIDS = {}; for (const m of SRC.matchAll(/P\("(Kids [^"]+)", "([^"]+)"\)/g)) KIDS[m[1]] = m[2].split('|');
const STEP = /^[1-7] (maj|min|dim|aug|sus2|sus4|7|maj7|m7)[^ ]* x(\d*\.?\d+) @(-?\d+)$/;
// Kids redesign: exactly six songs, in this order (Twinkle first = the default).
const SIX = ['Kids Twinkle', 'Kids Old MacDonald', 'Kids Itsy Bitsy Spider', 'Kids Row Your Boat', 'Kids Head Shoulders Knees and Toes', "Kids Mary's Lamb"];
test('six Kids songs, in order, every step well formed', () => {
  assert.deepEqual(Object.keys(KIDS), SIX);
  for (const [n, steps] of Object.entries(KIDS)) for (const s of steps) assert.match(s, STEP, `${n}: "${s}"`);
});
test('Kids melodies stay in the C..B octave except Head Shoulders (high C/D) and Itsy Bitsy (low G)', () => {
  const out = {}; for (const [n, steps] of Object.entries(KIDS)) { const o = steps.map(x => +x.match(STEP)[3]).filter(m => m < 0 || m > 11); if (o.length) out[n] = [...new Set(o)].sort((a, b) => a - b); }
  assert.deepEqual(out, { 'Kids Itsy Bitsy Spider': [-5], 'Kids Head Shoulders Knees and Toes': [12, 14] });
});
test('every Kids song has lyrics with one marker per step, and a C major song key; removed songs are gone', async () => {
  const { KIDS_LYRICS, KIDS_SONG_KEY } = await import('../../js/songs/kids-songs.js');
  assert.deepEqual(Object.keys(KIDS_LYRICS).sort(), [...SIX].sort()); assert.deepEqual(Object.keys(KIDS_SONG_KEY).sort(), [...SIX].sort());
  for (const n of SIX) { assert.deepEqual(KIDS_LYRICS[n].flatMap(l => l.markers.map(m => m.chordIndex)), [...Array(KIDS[n].length).keys()], n); assert.deepEqual(KIDS_SONG_KEY[n], ['C', 'major']); }
});
test('Row Your Boat: "merrily" first three notes an octave lower (v112.4)', () => {
  const s = KIDS['Kids Row Your Boat']; assert.ok(s);
  assert.deepEqual(s.map(x => +x.match(STEP)[3]), [0,0,0,2,4,4,2,4,5,7,0,0,0,7,7,7,4,4,4,0,0,0,7,5,4,2,0]);
  assert.deepEqual(s.map(x => x.replace(/ @-?\d+$/, '')).slice(10, 13), ['1 maj x0.125', '1 maj x0.125', '1 maj x0.125']);
});
