// Expert screen set: pure logic (no DOM). Unit-tested in tests/unit/expert.test.js.
// Mode switch (Kids / Simple / Expert), the Type bar (one tap opens / folds the chord-type table),
// the merged Song | Progressions control, and the labels the Expert screen shows.

export const EXPERT_STORE = "touchChord.expert.v1";   // separate from touchChord.settings.v1 (state.js is not touched)

// ---- Expert preference (on / look) ----
export function expertDefaults() { return { v: 1, on: false, look: "lamp" }; }   // decision 1: Lamplight is the Expert default look
export function sanitizePref(raw) {
  var d = expertDefaults();
  if (!raw || typeof raw !== "object") return d;
  return { v: 1, on: typeof raw.on === "boolean" ? raw.on : d.on, look: raw.look === "day" ? "day" : "lamp" };
}
export function parsePref(str) { try { return sanitizePref(JSON.parse(str)); } catch (e) { return expertDefaults(); } }
// ?expert=1 / ?expert=0 in the URL turns Expert on / off (and is saved like a tap on the mode switch).
export function prefFromUrl(search, pref) {
  var m = /[?&]expert=([01])(&|$)/.exec(search || "");
  if (!m) return pref;
  return Object.assign({}, pref, { on: m[1] === "1" });
}

// ---- Mode switch ----
// The screen the app shows: Kids style = Kids; Simple switch on = Simple; else Expert when the pref is on;
// else the classic Full screen (kept for the existing suites and for anyone who never picks Expert).
export function modeOf(s) {
  if (s.style === "kids") return "kids";
  if (s.simple) return "simple";
  return s.on ? "expert" : "full";
}
// What a tap on the mode switch changes. lastStyle = the last non-Kids style (Pop when none).
// Returns { style: <style to pick or null>, simple: <bool>, on: <bool> }.
export function modeTarget(cur, target, lastStyle) {
  var back = lastStyle && lastStyle !== "kids" ? lastStyle : "pop";
  if (target === "kids") return { style: cur.style === "kids" ? null : "kids", simple: false, on: false };
  if (target === "simple") return { style: cur.style === "kids" ? back : null, simple: true, on: false };
  return { style: cur.style === "kids" ? back : null, simple: false, on: true };   // expert
}

// ---- Type bar (decision 2: no Fold button; one tap opens / folds the 4x2 table) ----
// Optional hold-to-peek (mockup h note): holding the closed bar 0.3 s opens it; letting go folds it back,
// but only once no chord type is still held (so you can slide onto a type and keep holding).
export const TYPEBAR_HOLD_MS = 300;
export function typeBarInit(open) { return { open: !!open, peek: false, foldWhenFree: false }; }
export function typeBarReduce(s, a, ctx) {
  ctx = ctx || {};
  switch (a) {
    case "tap": return { open: !s.open, peek: false, foldWhenFree: false };
    case "hold": return s.open ? s : { open: true, peek: true, foldWhenFree: false };
    case "release":   // the finger that held the bar came up
      if (!s.peek) return s;
      if (ctx.paletteHeld) return { open: true, peek: true, foldWhenFree: true };
      return { open: false, peek: false, foldWhenFree: false };
    case "paletteFree":   // the last chord type was let go
      if (s.peek && s.foldWhenFree) return { open: false, peek: false, foldWhenFree: false };
      return s;
    case "close": return { open: false, peek: false, foldWhenFree: false };
    default: return s;
  }
}
export const TYPE_NAMES = { major: "Major", minor: "Minor", sus4: "Sus4", dim: "Dim" };
export const EXT_NAMES = { six: "6", min7: "min7", maj7: "maj7", nine: "9" };
// The Type bar label from the palette holds ({ pointerId: { kind: "type" | "ext", value } }).
// Nothing held: "Auto" (a key plays its own chord in the key, kb-fix rule); held: what the held buttons add.
export function typeBarLabel(holds) {
  var types = [], exts = [];
  Object.keys(holds || {}).forEach(function (id) {
    var h = holds[id];
    if (!h) return;
    if (h.kind === "type" && TYPE_NAMES[h.value] && types.indexOf(h.value) < 0) types.push(h.value);
    if (h.kind === "ext" && EXT_NAMES[h.value] && exts.indexOf(h.value) < 0) exts.push(h.value);
  });
  if (!types.length && !exts.length) return { text: "Auto", held: false };
  var t = types.length ? TYPE_NAMES[types[types.length - 1]] : "";   // the last held type wins (palette.js syncPalette)
  var e = ["six", "min7", "maj7", "nine"].filter(function (k) { return exts.indexOf(k) >= 0; }).map(function (k) { return EXT_NAMES[k]; });
  return { text: [t].concat(e).filter(Boolean).join(" + "), held: true };
}

// ---- Song | Progressions (decision 8: one control, one mode shows at a time) ----
// s = { view: "song" | "prog", listOpen }. ctx = { hasSong, songSelected }.
// Returns { s, fx } where fx is one of null, "openLibrary", "selectSong", { pick: i }.
export function sourceInit(ctx) { return { view: ctx && ctx.songSelected ? "song" : "prog", listOpen: false }; }
export function sourceReduce(s, a, ctx) {
  ctx = ctx || {};
  var type = typeof a === "string" ? a : a.type;
  switch (type) {
    case "tapSong":
      if (s.view === "song") return { s: { view: "song", listOpen: false }, fx: "openLibrary" };   // tap the active Song tab = the library (Load + Upload)
      if (!ctx.hasSong) return { s: { view: s.view, listOpen: false }, fx: "openLibrary" };   // no song yet: the library; a load switches to Song (sync)
      return { s: { view: "song", listOpen: false }, fx: ctx.songSelected ? null : "selectSong" };
    case "tapProg":
      if (s.view === "prog") return { s: { view: "prog", listOpen: !s.listOpen }, fx: null };
      return { s: { view: "prog", listOpen: true }, fx: null };   // the song keeps playing until a progression is picked
    case "tapBar": return { s: { view: s.view, listOpen: s.view === "prog" ? !s.listOpen : false }, fx: null };
    case "pick": return { s: { view: "prog", listOpen: false }, fx: { pick: a.i } };
    case "close": return { s: { view: s.view, listOpen: false }, fx: null };
    case "sync":   // the app changed the selection elsewhere (a song was loaded / opened, or a progression picked)
      if (ctx.songSelected && s.view !== "song") return { s: { view: "song", listOpen: false }, fx: null };
      if (!ctx.songSelected && s.view === "song" && ctx.hasSong) return { s: { view: "prog", listOpen: s.listOpen }, fx: null };
      return { s: s, fx: null };
    default: return { s: s, fx: null };
  }
}
// Step dots under the progression name: gold = now, dashed teal = next.
export function progDots(n, cur) {
  var out = [];
  for (var i = 0; i < n; i++) out.push(i === cur ? "now" : (cur < 0 ? i === 0 : i === (cur + 1) % n) ? "next" : "");
  return out;
}
// The lyric line for the current chord of an uploaded section: { before, word, after } (word = the word at the
// current chord's marker, shown on gold). sec = { lyrics: [{ text, markers: [{ charIndex, chordIndex }] }] }.
export function lyricNow(sec, ci) {
  var lines = (sec && sec.lyrics) || [];
  if (!lines.length) return null;
  var c = Math.max(0, ci), line = null, mk = null;
  lines.forEach(function (ln) { if (!line) (ln.markers || []).forEach(function (m) { if (!mk && m.chordIndex === c) { line = ln; mk = m; } }); });
  if (!line) lines.forEach(function (ln) { (ln.markers || []).forEach(function (m) { if (m.chordIndex <= c) { line = ln; mk = m; } }); });
  if (!line) { line = lines[0]; mk = null; }
  var t = String(line.text || "");
  if (!mk) return { before: "", word: "", after: t };
  var a = Math.max(0, Math.min(t.length, mk.charIndex | 0)), b = a;
  while (b < t.length && !/\s/.test(t.charAt(b))) b++;
  return { before: t.slice(0, a), word: t.slice(a, b), after: t.slice(b) };
}
// Style drop-down (decision 6): the nine styles with the mockup's short sound hints.
export const STYLE_MENU = [
  ["pop", "Pop", "bright triads"], ["kids", "Kids", "music box"], ["jazz", "Jazz", "7ths, 9ths"], ["rnb", "R&B", "smooth 9ths"],
  ["ballad", "Ballad", "slow, add9"], ["reggae", "Reggae", "off-beat"], ["funk", "Funk", "tight 9ths"], ["yogaDeep", "Yoga", "sus2 drone"],
  ["country", "Country", "I IV V7"]
];
export function styleName(id) { for (var i = 0; i < STYLE_MENU.length; i++) if (STYLE_MENU[i][0] === id) return STYLE_MENU[i][1]; return id; }
// The docked piano window in Expert (decision 10): C..B = 12 keys, 7 white keys (classic Full keeps its 13-key window).
export function expertWindowKeys(layout) { return layout === "octave" || layout === "piano" ? 12 : 0; }
