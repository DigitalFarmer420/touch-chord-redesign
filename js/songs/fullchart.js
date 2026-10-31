// Pure (no DOM): the sections an upload plays in its Full version (unit-tested in tests/unit/rd7.test.js).
// v103 fix: a Full section with no lyrics borrows the Simple section's lyric text (same id, else same
// place); each marker moves to the Full chord sounding at that Simple chord's bar / beat. Shallow copies
// only (chords shared), so the saved answer is unchanged.
export function upFullLyrics(full, simple, bpb) {
  function at(c) { var p = c.position || {}; return ((p.bar || 1) - 1) * (bpb || 4) + ((p.beat || 1) - 1); }
  return full.map(function (fs, i) {
    if (fs.lyrics && fs.lyrics.length) return fs;
    var ss = simple.filter(function (x) { return fs.id && x.id === fs.id; })[0] || simple[i];
    if (!ss || !ss.lyrics || !ss.lyrics.length) return fs;
    var lyr = ss.lyrics.map(function (ln) {
      var seen = {}, mk = [];
      (ln.markers || []).forEach(function (m) {
        var sc = ss.chords[m.chordIndex], t = sc ? at(sc) : 0, best = 0;
        fs.chords.forEach(function (fc, k) { if (at(fc) <= t) best = k; });
        if (!seen[best]) { seen[best] = true; mk.push({ charIndex: m.charIndex, chordIndex: best }); }
      });
      return { text: ln.text, markers: mk };
    });
    var o = {}; for (var k in fs) o[k] = fs[k];
    o.lyrics = lyr;
    return o;
  });
}
// rd7 (Noff rd6 #3): a Full chart that covers less of the song than the easy one (a v1.2 answer with only some Full
// sections) is filled in per section: where a Full section starts on the same bar as an easy section it is played (and
// the easy sections it spans are skipped), everywhere else the easy section is played, so Expert is never cut short.
// A Full chart as long as the easy one is used as it is (unchanged).
function upSecBeats(sec) { var b = 0; sec.chords.forEach(function (c) { b += c.durationBeats || 0; }); return b * (sec.repeat || 1); }
function upSecsBeats(L) { var b = 0; L.forEach(function (s) { b += upSecBeats(s); }); return b; }
export function upFullSecs(full, simple, bpb) {
  if (upSecsBeats(full) >= upSecsBeats(simple) - 1e-6) return upFullLyrics(full, simple, bpb);
  var out = [], pair = [], at = 0, fi = 0, starts = [], t = 0;
  full.forEach(function (f) { starts.push(t); t += upSecBeats(f); });
  var fAt = {}; starts.forEach(function (b, i) { fAt[Math.round(b * 1000)] = i; });
  var skipTo = -1;
  simple.forEach(function (sec) {
    if (at < skipTo - 1e-6) { at += upSecBeats(sec); return; }
    var k = fAt[Math.round(at * 1000)];
    if (k != null && full[k].chords && full[k].chords.length) { out.push(full[k]); pair.push(sec); skipTo = at + upSecBeats(full[k]); }
    else { out.push(sec); pair.push(sec); }
    at += upSecBeats(sec);
  });
  return upFullLyrics(out, pair, bpb).map(function (x, i) { return out[i] === pair[i] ? pair[i] : x; });
}
