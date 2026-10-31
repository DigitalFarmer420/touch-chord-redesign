// Pure (no DOM): the sections an upload plays in its Full version (unit-tested in tests/unit/rd7.test.js).
// v103 fix: a Full section with no lyrics borrows the Simple section's lyric text (same id, else same
// place); each marker moves to the Full chord sounding at that Simple chord's bar / beat. Shallow copies
// only (chords shared), so the saved answer is unchanged.
function offs(ch) { var o = [], t = 0; ch.forEach(function (c) { o.push(t); t += c.durationBeats || 0; }); return o; }
// rd10 (Noff rd9 Low): the lyrics of one pass of a repeated section. A Full section played more than once has one
// set of markers for every pass (v1.2 Anh's Full verse lists all the song's verse lines on chords 0-7, so pass 2 showed
// pass 1's lines). When the easy sections that tile a pass's bars have lyrics, that pass takes theirs: each marker goes
// to the Full chord sounding at its easy chord's beat inside the pass. Returns null when the easy chart does not tile
// the pass exactly or has no lyrics there (the section's own lyrics are kept).
function upPassLyrics(fs, A, P, simple, sStart) {
  var fOff = offs(fs.chords), lines = [], tiles = 0, any = false;
  for (var j = 0; j < simple.length; j++) {
    var es = simple[j], S = sStart[j], one = upSecBeats(es) / (es.repeat || 1), L = upSecBeats(es);
    if (S + L <= A + 1e-6 || S >= A + P - 1e-6) continue;
    if (S < A - 1e-6 || S + L > A + P + 1e-6) return null;   // an easy section straddles the pass: no clean split
    tiles += L;
    var eOff = offs(es.chords);
    for (var r = 0; r < (es.repeat || 1); r++) (es.lyrics || []).forEach(function (ln) {
      var seen = {}, mk = [];
      (ln.markers || []).forEach(function (m) {
        var t = S + r * one + (eOff[m.chordIndex] || 0) - A, best = 0;
        fOff.forEach(function (o, k) { if (o <= t + 1e-6) best = k; });
        if (!seen[best]) { seen[best] = true; mk.push({ charIndex: m.charIndex, chordIndex: best }); }
      });
      if (ln.text) any = true;
      lines.push({ text: ln.text, markers: mk });
    });
  }
  return any && Math.abs(tiles - P) < 1e-6 ? lines : null;
}
export function secLyrics(sec, rep) { return (sec && sec.passLyrics && sec.passLyrics[rep || 0]) || (sec && sec.lyrics) || []; }
export function upFullLyrics(full, simple, bpb, easy) {   // easy: the whole easy chart in play order (default simple)
  function at(c) { var p = c.position || {}; return ((p.bar || 1) - 1) * (bpb || 4) + ((p.beat || 1) - 1); }
  var fStart = [], sStart = [], t0 = 0;
  full.forEach(function (f) { fStart.push(t0); t0 += upSecBeats(f); });
  easy = easy || simple;
  t0 = 0; easy.forEach(function (x) { sStart.push(t0); t0 += upSecBeats(x); });
  return full.map(function (fs, i) {
    if ((fs.repeat || 1) > 1 && fs.chords && fs.chords.length) {
      var P = upSecBeats(fs) / fs.repeat, pass = [], ok = true;
      for (var r = 0; r < fs.repeat; r++) { var L = upPassLyrics(fs, fStart[i] + r * P, P, easy, sStart); if (!L) { ok = false; break; } pass.push(L); }
      if (ok) { var o2 = {}; for (var k2 in fs) o2[k2] = fs[k2]; o2.passLyrics = pass; o2.lyrics = pass[0]; return o2; }
    }
    if (fs.lyrics && fs.lyrics.length) return fs;
    var ss = simple.filter(function (x) { return fs.id && x.id === fs.id; })[0] || simple[i];
    if (!ss || !ss.lyrics || !ss.lyrics.length) return fs;
    // rd9 (Noff rd8 Medium): a reused Full section (rd8) has the donor section's chords, whose positions are the
    // donor's bars. There the beat is counted from the section's own start (sum of the chords before it), for the
    // easy chord and the Full chord alike, so every marker lands on the Full chord sounding at its own beat.
    var rel = !!fs.reusedFrom, sOff = rel ? offs(ss.chords) : null, fOff = rel ? offs(fs.chords) : null;
    var lyr = ss.lyrics.map(function (ln) {
      var seen = {}, mk = [];
      (ln.markers || []).forEach(function (m) {
        var sc = ss.chords[m.chordIndex], t = sc ? (rel ? sOff[m.chordIndex] : at(sc)) : 0, best = 0;
        fs.chords.forEach(function (fc, k) { if ((rel ? fOff[k] : at(fc)) <= t + 1e-6) best = k; });
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
// rd8 (Noff rd7 #3): a later easy section with no Full section at its place reuses a Full section's voicings when
// it is the same music as the easy section that Full section was written over. Rule: a Full section's "origin" is the
// easy section that starts on the same beat and lasts one Full pass; the easy section is reused-for when its chords
// (symbols and beats, and its repeat) are identical to that origin's. Same section type first (verse -> the Full
// verse), then any type (the solo is the intro's chords -> the Full intro). The reused copy keeps the easy section's
// id, label, repeat and lyrics (markers moved to the Full chords), so the length and order never change. No match, or
// different chords: the easy section as it is.
function upSig(sec) { return JSON.stringify([sec.repeat || 1, sec.chords.map(function (c) { return [c.chord, c.durationBeats]; })]); }
function upReuse(f, sec) {
  var o = {}; for (var k in f) o[k] = f[k];
  o.id = sec.id; o.type = sec.type; o.label = sec.label; o.repeat = sec.repeat || 1; o.lyrics = []; o.reusedFrom = f.id;
  return o;
}
export function upFullSecs(full, simple, bpb) {
  if (upSecsBeats(full) >= upSecsBeats(simple) - 1e-6) return upFullLyrics(full, simple, bpb);
  var out = [], pair = [], at = 0, starts = [], t = 0;
  full.forEach(function (f) { starts.push(t); t += upSecBeats(f); });
  var fAt = {}; starts.forEach(function (b, i) { fAt[Math.round(b * 1000)] = i; });
  var skipTo = -1;
  simple.forEach(function (sec) {
    if (at < skipTo - 1e-6) { at += upSecBeats(sec); return; }
    var k = fAt[Math.round(at * 1000)];
    if (k != null && full[k].chords && full[k].chords.length) { out.push(full[k]); pair.push(sec); skipTo = at + upSecBeats(full[k]); }
    else { out.push(null); pair.push(sec); }
    at += upSecBeats(sec);
  });
  // origins: the easy section each placed Full section was written over (one Full pass long)
  var origin = full.map(function (f, k) {
    var j = -1; pair.forEach(function (p, i) { if (out[i] === f) j = i; });
    if (j < 0) return null;
    var e = pair[j], one = upSecBeats(f) / (f.repeat || 1);
    return Math.abs(upSecBeats(e) / (e.repeat || 1) - one) < 1e-6 ? upSig(e) : null;
  });
  out = out.map(function (o, i) {
    if (o) return o;
    var sec = pair[i], sg = upSig(sec), hit = -1;
    full.forEach(function (f, k) { if (hit < 0 && origin[k] === sg && f.type === sec.type) hit = k; });
    if (hit < 0) full.forEach(function (f, k) { if (hit < 0 && origin[k] === sg) hit = k; });
    return hit >= 0 ? upReuse(full[hit], sec) : sec;
  });
  return upFullLyrics(out, pair, bpb, simple).map(function (x, i) { return out[i] === pair[i] ? pair[i] : x; });
}
