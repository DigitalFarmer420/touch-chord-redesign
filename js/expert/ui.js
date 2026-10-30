// Expert screen set (decisions 1-11 from the user, Uiux mockups expert-v9 / expert-ipad-v2).
// html.expert re-lays out the Full-mode controls (the chord grid #suggest, the chord-type table #palette,
// #sustainBtn, the Sound / FX / Layout / Loop panel #ctl, the keys #pads) with css/expert.css and adds the
// Expert-only controls below. Every new control drives the existing code (same functions or the same
// buttons), so sound, timing and music theory are exactly the 351c02c ones.
import { unlock } from "../audio/unlock.js?v=112.13";
import { activeKey } from "../keys.js?v=112.13";
import { setKidKey } from "../kids.js?v=112.13";
import { prog, progSet, placeBadges, setBadgeAvoid, magic } from "../songs/playback.js?v=112.13";
import { magicQueue } from "../songs/magic.js?v=112.13";
import { nextHintSpec } from "../ui/next.js?v=112.13";
import { progFeel, progSteps, progNumerals } from "../songs/presets.js?v=112.13";
import { upSelected, upCurStep, upNextStep } from "../songs/song.js?v=112.13";
import { state, shared, fingers } from "../state.js?v=112.13";
import { accSym } from "../theory/spelling.js?v=112.13";
import { Theory } from "../theory/index.js?v=112.13";
import { paintKeyChip, keyLabel } from "../ui/keychip.js?v=112.13";
import { fitNowSymbol } from "../ui/nowbox.js?v=112.13";
import { computeSpec, renderPads, refreshHeld, setWinKeys } from "../ui/pads.js?v=112.13";
import { liftFinger } from "../ui/touch.js?v=112.13";
import { stripRelease } from "../ui/strip.js?v=112.13";
import { fitStrip, stripLabel } from "../ui/strip.js?v=112.13";
import { setExpert as setKidsViewOff, setModeHandler } from "../kids/view.js?v=112.13";   // redesign-dev: the Kids view (kids-build) is the switch's Kids
import { EXPERT_STORE, parsePref, prefFromUrl, modeOf, modeTarget, typeBarInit, typeBarReduce, typeBarLabel, TYPEBAR_HOLD_MS,
  sourceInit, sourceReduce, progDots, lyricNow, STYLE_MENU, styleName, expertWindowKeys } from "./model.js?v=112.13";

var pref, tb, src, lastStyle = "pop", active = false, built = false, lastSel = null, lastProg = 0;
export const xLog = { mode: [], src: [], tb: [] };   // read by the e2e suite (?test=1 hooks)
var $ = function (id) { return document.getElementById(id); };
function el(tag, cls, html, attrs) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
  if (tag === "button") e.type = "button";
  return e;
}
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
function savePref() { try { localStorage.setItem(EXPERT_STORE, JSON.stringify(pref)); } catch (e) {} }
function loadPref() { var raw = null; try { raw = localStorage.getItem(EXPERT_STORE); } catch (e) {} return raw ? parsePref(raw) : parsePref("{}"); }
function srcCtx() { return { hasSong: !!shared.U, songSelected: upSelected() }; }
function isLand() { var c = document.documentElement.classList; return c.contains("lay-phone-land") || c.contains("lay-pad-land"); }
function click(sel) { var b = typeof sel === "string" ? document.querySelector(sel) : sel; if (b) b.click(); return !!b; }

// ---------- mode ----------
export function expertActive() { return active; }
export function currentMode() { return modeOf({ kv: !!shared.kidsView, style: state.style, simple: state.simple, on: pref.on }); }
// rd2 (Noff, rd1 Low): a finger that went down before a mode switch must not act on the new screen when it lifts
// (hold a Kids pad, switch to Simple, lift on a chip: no chord). Its own release still runs (the held sound ends as
// before); only the click its lift would make on whatever is under it now is dropped.
var downs = {}, stale = {}, staleUp = {};
function guardTouches() {
  // rd3 (Noff rd2 Low): no time window. Only the click that belongs to a pointer which went down before the switch is
  // dropped (same pointerId). A click with no pointer id (keyboard, switch access, element.click(), older iOS) always works.
  window.addEventListener("pointerdown", function (e) { downs[e.pointerId] = true; delete stale[e.pointerId]; delete staleUp[e.pointerId]; }, true);
  function up(e) {
    delete downs[e.pointerId];
    if (!stale[e.pointerId]) return;
    delete stale[e.pointerId];
    stripRelease(e.pointerId); if (fingers[e.pointerId]) liftFinger(e.pointerId);   // the old screen's hold ends (no-ops when already done)
    staleUp[e.pointerId] = true;
    xLog.staleLift = (xLog.staleLift || 0) + 1;
  }
  window.addEventListener("pointerup", up, true); window.addEventListener("pointercancel", up, true);
  window.addEventListener("click", function (e) {
    var id = e.pointerId;
    if (id == null || id < 0 || !staleUp[id]) return;
    delete staleUp[id];
    e.stopImmediatePropagation(); e.preventDefault(); xLog.staleClick = (xLog.staleClick || 0) + 1;
  }, true);
}
export function setMode(target) {
  Object.keys(downs).forEach(function (id) { stale[id] = true; });   // fingers down now belong to the old screen
  var t = modeTarget({ style: state.style, simple: state.simple }, target, lastStyle);
  xLog.mode.push(target);
  closeAll();
  pref.on = t.on; savePref();
  if (t.kv) {   // Kids = the Kids view: leave the Expert screen first, then the Kids view takes over (it picks the Kids style)
    paintMode();
    setKidsViewOff(false);
    paintMode();
    return;
  }
  if (shared.kidsView) setKidsViewOff(true);   // back to the full app (the Kids view keeps its place in the song)
  if (t.style) click("#styles button[data-style=\"" + t.style + "\"]");
  if (t.simple !== null && !!state.simple !== t.simple) click("#simpleBtn");
  paintMode();
}
function paintMode() {
  if (state.style !== "kids") lastStyle = state.style;
  var de = document.documentElement, on = currentMode() === "expert";
  de.classList.toggle("x-lamp", pref.look !== "day");
  de.classList.toggle("x-day", pref.look === "day");
  if (on !== active) {
    active = on;
    de.classList.toggle("expert", on);
    if (!on) closeAll();
    setWinKeys(on ? expertWindowKeys("octave") : 0);   // decision 10: C..B in the Octave / Piano window (Fourths / Full unchanged)
    renderPads(); refreshHeld(); paintKeyChip(computeSpec());
    setTimeout(function () { fitStrip(); placeBadges(); fitNowSymbol(); }, 0);
  }
  paintModeSegs();
  if (on) paint();
}
function paintModeSegs() {
  var m = currentMode();
  Array.prototype.forEach.call(document.querySelectorAll(".x-mode button[data-mode]"), function (b) {
    var o = b.dataset.mode === m; b.classList.toggle("on", o); b.setAttribute("aria-checked", o ? "true" : "false");
  });
}

// ---------- build ----------
function build() {
  var app = $("app"), nowCol = document.querySelector(".now-col");
  var top = el("div", "x-top", null, { id: "xTop" });
  top.appendChild(el("button", "x-b x-key", "<span class=\"x-kl\">C major</span><span class=\"x-car\">\u25be</span>", { id: "xKey", "aria-haspopup": "dialog", "aria-label": "Key" }));
  top.appendChild(el("button", "x-b x-style", "<span class=\"x-sl\">Pop</span><span class=\"x-car\">\u25be</span>", { id: "xStyle", "aria-haspopup": "listbox", "aria-expanded": "false", "aria-label": "Style" }));
  top.appendChild(el("span", "x-slot"));
  top.appendChild(el("button", "x-b x-badge", "Expert", { id: "xBadge", "aria-haspopup": "dialog", title: "Settings" }));
  top.appendChild(el("button", "x-b x-help", "?", { id: "xHelp", "aria-label": "How to" }));
  var tog = el("div", "x-seg x-tog", "<button type=\"button\" data-v=\"song\" role=\"tab\">\u266c Song</button><button type=\"button\" data-v=\"prog\" role=\"tab\">\u25a6 Progressions</button>", { id: "xTog", role: "tablist", "aria-label": "Song or progressions" });
  var go = el("div", "x-go", null, { id: "xGo" });
  go.appendChild(el("button", "x-b x-next", "Next \u279c", { id: "xNext", "aria-label": "Next chord" }));
  go.appendChild(el("button", "x-b x-play", "\u25b6", { id: "xPlay", "aria-label": "Play song", "aria-pressed": "false" }));
  var song = el("div", "x-src", null, { id: "xSrc" });
  var list = el("div", "x-plist", null, { id: "xPList", role: "listbox", "aria-label": "Progressions", hidden: "" });
  var ctl = el("div", "x-ctl", null, { id: "xCtl" });
  ctl.appendChild(el("button", "x-b x-type", "<span class=\"x-tcol\"><span class=\"x-lbl\">Type</span><span class=\"x-tv\">Auto</span></span><span class=\"x-car\">\u25be</span>", { id: "xType", "aria-expanded": "false", "aria-controls": "chords", "aria-label": "Chord type table" }));
  ctl.appendChild(el("button", "x-b x-full", "Full Range", { id: "xFull", "aria-pressed": "false" }));
  ctl.appendChild(el("button", "x-b x-sound", "<span>Sound \u25b4</span><small>FX\u00b7Layout\u00b7Loop</small>", { id: "xSound", "aria-expanded": "false", "aria-controls": "ctl" }));
  var scrim = el("div", "x-scrim", null, { id: "xScrim", hidden: "" });
  var smenu = el("div", "x-menu", null, { id: "xStyleMenu", role: "listbox", "aria-label": "Style", hidden: "" });
  STYLE_MENU.forEach(function (s) { var b = el("button", "x-mi", "<b>" + esc(s[1]) + "</b><span>" + esc(s[2]) + "</span>", { role: "option", "data-style": s[0] }); smenu.appendChild(b); });
  var ksheet = el("div", "x-sheet x-keysheet", "<div class=\"x-grab\"></div><div class=\"x-sh-h\"><span>Key</span><button type=\"button\" class=\"x-b x-close\" aria-label=\"Close\">\u2715</button></div><div class=\"x-mini\" role=\"radiogroup\" aria-label=\"Key note\"></div><div class=\"x-seg x-kmode\"><button type=\"button\" data-km=\"major\">Major</button><button type=\"button\" data-km=\"minor\">Minor</button></div>", { id: "xKeySheet", role: "dialog", "aria-label": "Key", hidden: "" });
  var mini = ksheet.querySelector(".x-mini"), whites = el("div", "x-mw"), blacks = el("div", "x-mbk");
  var BL = { 1: 1, 3: 1, 6: 1, 8: 1, 10: 1 }, wi = 0;
  for (var pc = 0; pc < 12; pc++) {
    var b = el("button", "x-mk " + (BL[pc] ? "bk" : "wk") + " n" + pc, "<span>" + accSym(Theory.NOTE_NAMES[pc]) + "</span>", { "data-pc": String(pc), role: "radio" });
    if (BL[pc]) { b.style.left = "calc(" + (wi / 7 * 100) + "% - 6.5%)"; blacks.appendChild(b); } else { whites.appendChild(b); wi++; }
  }
  mini.appendChild(whites); mini.appendChild(blacks);
  var sset = el("div", "x-sheet x-settings", null, { id: "xSettings", role: "dialog", "aria-label": "Settings", hidden: "" });
  sset.innerHTML = "<div class=\"x-grab\"></div><div class=\"x-sh-h\"><span>Settings</span><button type=\"button\" class=\"x-b x-close\" aria-label=\"Close\">\u2715</button></div>"
    + "<div class=\"x-lbl\">Mode</div><div class=\"x-seg x-mode\" role=\"radiogroup\" aria-label=\"Mode\"><button type=\"button\" role=\"radio\" data-mode=\"kids\">Kids</button><button type=\"button\" role=\"radio\" data-mode=\"simple\">Simple</button><button type=\"button\" role=\"radio\" data-mode=\"expert\">Expert</button></div>"
    + "<button type=\"button\" class=\"x-set\" data-proxy=\"playAlongBtn\"><span class=\"x-st\">Play along<small>Tap the marked chord to move on</small></span><span class=\"x-tg\"></span></button>"
    + "<button type=\"button\" class=\"x-set\" data-proxy=\"paHintsBtn\"><span class=\"x-st\">Show hints<small>Gold now, dashed next chord</small></span><span class=\"x-tg\"></span></button>"
    + "<button type=\"button\" class=\"x-set\" data-proxy=\"progNumsBtn\"><span class=\"x-st\">Progression numbers</span><span class=\"x-tg\"></span></button>"
    + "<div class=\"x-set x-look\"><span class=\"x-st\">Look<small>Lamp is the Expert default</small></span><span class=\"x-seg\"><button type=\"button\" data-look=\"day\">\u2600 Day</button><button type=\"button\" data-look=\"lamp\">\u263e Lamp</button></span></div>"
    + "<button type=\"button\" class=\"x-set x-go-row\" data-act=\"upload\"><span class=\"x-st\">Upload a song</span><span class=\"x-chev\">\u203a</span></button>"
    + "<button type=\"button\" class=\"x-set x-go-row\" data-act=\"howto\"><span class=\"x-st\">How to</span><span class=\"x-chev\">\u203a</span></button>"
    + "<button type=\"button\" class=\"x-set x-go-row\" data-act=\"tour\"><span class=\"x-st\">Tour</span><span class=\"x-chev\">\u203a</span></button>"
    + "<button type=\"button\" class=\"x-set x-go-row x-danger\" data-act=\"reset\"><span class=\"x-st\">Start over<small>Asks first; resets settings</small></span><span class=\"x-chev\">\u203a</span></button>"
    + "<div class=\"x-ver\"></div>";
  [top, tog, go, song, list, ctl, scrim, smenu, ksheet, sset].forEach(function (n) { app.insertBefore(n, nowCol); });
  // Sound sheet extras (inside the existing Sound pane; shown only in Expert): a Vol slider that drives #volume.
  var vol = el("label", "x-volrow", "<span>Vol</span><input id=\"xVol\" type=\"range\" min=\"0\" max=\"100\" step=\"1\" aria-label=\"Volume\"><b id=\"xVolVal\"></b>");
  $("paneSound").appendChild(vol);
  // Decision 11: the mode switch also lives in the gear menu (Kids / Simple / classic Full screens).
  var gm = el("div", "x-gearmode", "<span class=\"cfg-lbl\">Mode</span><span class=\"x-seg x-mode\" role=\"radiogroup\" aria-label=\"Mode\"><button type=\"button\" role=\"radio\" data-mode=\"kids\">Kids</button><button type=\"button\" role=\"radio\" data-mode=\"simple\">Simple</button><button type=\"button\" role=\"radio\" data-mode=\"expert\">Expert</button></span>", { id: "modeRow" });
  $("configMenu").insertBefore(gm, $("configMenu").firstChild);
  built = true;
}

// ---------- sheets / menus ----------
function openOnly(id) {
  closeAll(id);
  var n = $(id); if (!n) return;
  n.hidden = false; $("xScrim").hidden = false;
  document.documentElement.classList.add("x-sheet-on");
  if (id === "xStyleMenu") { $("xStyle").setAttribute("aria-expanded", "true"); $("xStyle").classList.add("open"); }
  placeSheets();
}
export function closeAll(except) {
  ["xStyleMenu", "xKeySheet", "xSettings"].forEach(function (id) { if (id !== except && $(id)) $(id).hidden = true; });
  if ($("xStyle")) { $("xStyle").setAttribute("aria-expanded", "false"); $("xStyle").classList.remove("open"); }
  if (except !== "ctl") setCtlSheet(false);
  if (src && src.listOpen && except !== "xPList") srcDo("close");
  if ($("xScrim")) $("xScrim").hidden = !except;
  document.documentElement.classList.toggle("x-sheet-on", !!except);
}
function setCtlSheet(on) {
  var de = document.documentElement;
  if (!!on === de.classList.contains("x-ctl-on")) return;
  de.classList.toggle("x-ctl-on", !!on);
  if ($("xSound")) { $("xSound").setAttribute("aria-expanded", on ? "true" : "false"); $("xSound").classList.toggle("open", !!on); }
  if (on) {
    var ctl = $("ctl");
    if (!ctl.dataset.open) click("#ctl .ctl-tabs button[data-tab=\"sound\"]");
    if (de.classList.contains("lay-phone-land") && !de.classList.contains("drawer-open")) click("#ctlToggle");   // phone landscape: the classic drawer shows the panes
    $("xScrim").hidden = false;
    placeSheets();
  } else if (de.classList.contains("drawer-open")) click("#ctlToggle");
}
// Sheets stop above the piano (decision 10: the keys are never squeezed or covered).
function placeSheets() {
  var kb = document.querySelector(".kb-wrap"), top = $("xTop");
  if (!kb || !top) return;
  var r = kb.getBoundingClientRect(), t = top.getBoundingClientRect();
  document.documentElement.style.setProperty("--x-kb-top", Math.round(r.top) + "px");
  document.documentElement.style.setProperty("--x-top-b", Math.round(t.bottom) + "px");
  var sb = $("xStyle").getBoundingClientRect();
  $("xStyleMenu").style.left = Math.round(sb.left) + "px";
  $("xStyleMenu").style.top = Math.round(sb.bottom + 6) + "px";
  var s = $("xSrc").getBoundingClientRect();
  $("xPList").style.top = Math.round(s.bottom + 6) + "px";
  document.documentElement.style.setProperty("--x-pl-top", Math.round(s.bottom + 6) + "px");
}
function placeTog() {   // landscape: the Song | Progressions toggle sits in the top bar's free middle (iPad landscape mockup)
  var tog = $("xTog"), slot = document.querySelector("#xTop .x-slot");
  if (isLand()) { if (tog.parentNode !== slot) slot.appendChild(tog); }
  else if (tog.parentNode !== $("app")) $("app").insertBefore(tog, $("xGo"));
}

// ---------- Type bar (decisions 2, 3, 4, 9) ----------
function tbDo(a) {
  var before = tb.open;
  tb = typeBarReduce(tb, a, { paletteHeld: Object.keys(shared.paletteHolds || {}).length > 0 });
  xLog.tb.push(a + ":" + (tb.open ? "open" : "closed"));
  if (before !== tb.open) {
    document.documentElement.classList.toggle("x-types-open", tb.open);
    $("xType").setAttribute("aria-expanded", tb.open ? "true" : "false");
    setTimeout(function () { fitStrip(); placeBadges(); placeSheets(); }, 0);
  }
  paintType();
}
export function typeBarState() { return Object.assign({}, tb); }
function paintType() {
  var holds = shared.paletteHolds || {}, lab = typeBarLabel(holds);
  var tv = document.querySelector("#xType .x-tv");
  if (tv && tv.textContent !== lab.text) tv.textContent = lab.text;
  $("xType").classList.toggle("held", lab.held);
  $("xType").querySelector(".x-car").textContent = tb.open ? "\u25b4" : "\u25be";
  var held = {};
  Object.keys(holds).forEach(function (id) { var h = holds[id]; if (h) held[(h.kind === "type" ? "t:" : "e:") + h.value] = 1; });
  Array.prototype.forEach.call(document.querySelectorAll("#palette button"), function (b) {
    var k = b.dataset.type ? "t:" + b.dataset.type : "e:" + b.dataset.ext;
    b.classList.toggle("x-held", !!held[k]);
  });
  paintMarks();   // keys: the sounding chord's pitch classes (mockup h: F A C E on the C..B keys)
  // NOW box: the played-with-a-held-type cue (teal ring + \u266a))) on the notes)
  document.documentElement.classList.toggle("x-heldplay", lab.held && Object.keys(fingers).length > 0);
}

// ---------- key marks by pitch class (rd3, Noff rd2 Med) ----------
// The Expert piano shows one 12-key window (7 white keys, decision 10). A sounding or next-chord note outside it is
// marked on its same-name key inside the window, in its normal gold / teal, with a small up / down arrow (as the Kids
// arrows). Visual only: nothing here changes what sounds.
var pc12 = function (m) { return ((m % 12) + 12) % 12; };
function soundingMidis() {
  var out = {};
  Object.keys(fingers).forEach(function (id) { (fingers[id].midis || []).forEach(function (m) { out[m] = 1; }); });
  var sp = shared.suggestPreview, raw = sp && sp.raw, pv = sp && sp.midis;
  if (raw) raw.forEach(function (m) { out[m] = 1; });   // the true sounding notes (pv.midis are moved onto the drawn keys)
  else if (pv) Object.keys(pv).forEach(function (m) { if (pv[m]) out[m] = 1; });
  return Object.keys(out).map(Number).filter(isFinite);
}
function nextMidis() {   // the same gate as the classic next-chord hint (next.js paintNextHint)
  try {
    if (!magic || state.simple || prog.playing || state.style === "kids" || !prog.steps.length) return [];
    var d = magicQueue(); if (!d) return [];
    if (upSelected() && upNextStep() < 0) return [];
    var sp = nextHintSpec(d.item); return (sp && sp.midis || []).map(Number).filter(isFinite);
  } catch (e) { return []; }
}
export function markPlan(keys, sounding, next) {   // keys: [{midi, pc}] in the window; returns { midi: { gold, teal, up, down } }
  var lo = Infinity, hi = -Infinity, byPc = {}, plan = {};
  keys.forEach(function (k) { lo = Math.min(lo, k.midi); hi = Math.max(hi, k.midi); byPc[k.pc] = k.midi; plan[k.midi] = {}; });
  function mark(list, kind) {
    var inWin = {}, out = {};
    list.forEach(function (m) { if (m >= lo && m <= hi) inWin[pc12(m)] = 1; else (out[pc12(m)] = out[pc12(m)] || []).push(m); });
    list.forEach(function (m) { if (m >= lo && m <= hi && plan[m]) plan[m][kind] = true; });
    Object.keys(out).forEach(function (pc) {
      if (inWin[pc] || byPc[pc] == null) return;   // the same note name already sounds in the window
      var k = plan[byPc[pc]]; k[kind] = true;
      if (out[pc].some(function (m) { return m > hi; })) k[kind + "Up"] = true; else k[kind + "Down"] = true;
    });
  }
  mark(sounding, "gold"); mark(next, "teal");
  return plan;
}
function paintMarks() {
  var pads = Array.prototype.slice.call(document.querySelectorAll("#pads .pad")).filter(function (k) { return isFinite(+k.dataset.midi); });
  if (!active || !pads.length) { pads.forEach(function (k) { k.classList.remove("x-pclit", "x-pcnx", "x-up", "x-down"); }); return; }
  var plan = markPlan(pads.map(function (k) { return { midi: +k.dataset.midi, pc: pc12(+k.dataset.midi) }; }), soundingMidis(), nextMidis());
  pads.forEach(function (k) {
    var p = plan[+k.dataset.midi] || {}, held = k.classList.contains("held");
    var gold = !!p.gold && !held, teal = !!p.teal && !p.gold && !held && !k.classList.contains("nx");
    var up = p.gold ? !!p.goldUp : (p.teal ? !!p.tealUp : false), down = p.gold ? !!p.goldDown : (p.teal ? !!p.tealDown : false);
    if (k.classList.contains("x-pclit") !== gold) k.classList.toggle("x-pclit", gold);
    if (k.classList.contains("x-pcnx") !== teal) k.classList.toggle("x-pcnx", teal);
    if (k.classList.contains("x-up") !== up) k.classList.toggle("x-up", up);
    if (k.classList.contains("x-down") !== down) k.classList.toggle("x-down", down);
    var at = !p.gold && !!p.teal && (up || down); if (k.classList.contains("x-arrow-teal") !== at) k.classList.toggle("x-arrow-teal", at);
  });
}
if (/[?&]test=1\b/.test(location.search)) window.__xMarks = { sounding: soundingMidis, next: nextMidis, plan: markPlan, paint: paintMarks };
var marksMo = null, marksT = 0;
function watchMarks() {   // the classic code repaints the keys often (held / nx / window moves): repaint the marks right after
  if (marksMo || !window.MutationObserver) return;
  marksMo = new MutationObserver(function () { if (!marksT) marksT = setTimeout(function () { marksT = 0; paintMarks(); }, 0); });
  marksMo.observe($("pads"), { attributes: true, attributeFilter: ["class"], subtree: true, childList: true });
  setInterval(function () { if (active) paintMarks(); }, 120);   // preview ends / playback steps that touch no key class
}

// ---------- Song | Progressions (decision 8) ----------
function srcDo(a) {
  var r = sourceReduce(src, a, srcCtx());
  src = r.s; lastSel = upSelected();
  xLog.src.push((typeof a === "string" ? a : a.type) + ":" + src.view + (src.listOpen ? "+list" : ""));
  if (r.fx === "openLibrary") { closeAll(); click("#uploadBtn"); }
  else if (r.fx === "selectSong") { for (var i = 0; i < prog.list.length; i++) if (prog.list[i].up) { progSet(i); break; } }
  else if (r.fx && r.fx.pick != null) progSet(r.fx.pick);
  $("xScrim").classList.toggle("x-clear", src.listOpen && !document.documentElement.classList.contains("x-sheet-on"));
  if (src.listOpen) { $("xScrim").hidden = false; placeSheets(); } else if ($("xScrim") && !document.documentElement.classList.contains("x-sheet-on")) $("xScrim").hidden = true;
  paintSrc();
}
export function sourceState() { return Object.assign({}, src); }
function paintSrc() {
  if (!active) return;
  var sel = upSelected();
  if (sel !== lastSel) { lastSel = sel; src = sourceReduce(src, "sync", srcCtx()).s; }   // only when the selection changed elsewhere (load / open / pick)
  Array.prototype.forEach.call($("xTog").querySelectorAll("button"), function (b) { var o = b.dataset.v === src.view; b.classList.toggle("on", o); b.setAttribute("aria-selected", o ? "true" : "false"); });
  var box = $("xSrc"), html, sig;
  if (src.view === "song") {
    var U = shared.U;
    if (U && upSelected()) {
      var cur = upCurStep(), e0 = U.events[cur >= 0 ? cur : 0] || U.events[0], sec = e0 ? U.secs[e0.si] : null;
      var ly = sec ? lyricNow(sec, cur >= 0 ? e0.ci : -1) : null;
      var line = ly ? esc(ly.before) + (ly.word ? "<span class=\"x-now\">" + esc(ly.word) + "</span>" : "") + esc(ly.after)
        : (sec ? sec.chords.map(function (c, ci) { return "<span class=\"" + (cur >= 0 && ci === e0.ci ? "x-now" : "") + "\">" + esc(accSym(c.chord)) + "</span>"; }).join(" ") : "");
      var locked = !!U.locked;
      html = "<div class=\"x-songc\"><div class=\"x-stitle\">" + esc(U.title) + (U.artist ? " \u00b7 " + esc(U.artist) : "") + "</div><div class=\"x-sline\">" + line + "</div></div>"
        + "<button type=\"button\" class=\"x-b x-lock\" aria-pressed=\"" + locked + "\" aria-label=\"Lock the song chords\"><span class=\"x-lki\">" + (locked ? "\ud83d\udd12" : "\ud83d\udd13") + "</span>Lock</button>";
    } else {
      html = "<div class=\"x-songc x-empty\"><div class=\"x-stitle\">No song loaded</div><div class=\"x-sline\">Tap Song to open My songs and Upload</div></div>";
    }
    box.className = "x-src x-mode-song";
  } else {
    var songOn = upSelected();
    if (!songOn) lastProg = prog.idx;
    else if (!prog.list[lastProg] || prog.list[lastProg].up) lastProg = firstProg();
    var p = prog.list[songOn ? lastProg : prog.idx], n = songOn ? (p && p.steps ? p.steps.length : 0) : prog.steps.length;
    var dots = progDots(n, songOn ? -1 : prog.cur).map(function (d) { return "<i class=\"" + d + "\"></i>"; }).join("");
    html = "<button type=\"button\" class=\"x-pbar" + (src.listOpen ? " open" : "") + "\" aria-expanded=\"" + src.listOpen + "\" aria-controls=\"xPList\"><span class=\"x-pcol\"><span class=\"x-pn\">" + esc(p ? progFeel(p.name) : "") + " <small>" + esc(songOn ? (p ? progNumerals(progSteps(prog.key || activeKey() || { pc: 0, mode: "major" }, p)) : "") : (prog.label ? prog.label.num : "")) + "</small></span><span class=\"x-dots\">" + dots + "</span></span><span class=\"x-car\">" + (src.listOpen ? "\u25b4" : "\u25be") + "</span></button>";
    box.className = "x-src x-mode-prog";
  }
  sig = src.view + "|" + html;
  if (box._sig !== sig) { box.innerHTML = html; box._sig = sig; }
  paintList();
}
function firstProg() { for (var i = 0; i < prog.list.length; i++) if (!prog.list[i].up) return i; return 0; }
function paintList() {
  var L = $("xPList");
  L.hidden = !(src.view === "prog" && src.listOpen);
  if (L.hidden) return;
  var k = prog.key || activeKey() || { pc: 0, mode: "major" };
  var sig = prog.idx + "|" + lastProg + "|" + prog.list.length + "|" + k.pc + k.mode + state.style;
  if (L._sig === sig) return;
  L._sig = sig;
  var h = "<div class=\"x-lbl\">" + esc(styleName(state.style)) + " progressions \u00b7 " + esc(keyLabel(k)) + "</div>";
  prog.list.forEach(function (p, i) {
    if (p.up) return;
    var steps = progSteps(k, p), num = progNumerals(steps);
    var chips = steps.map(function (s) { return "<i class=\"x-pc " + esc(s.item.type) + "\">" + esc(accSym(stripLabel(s.item))) + "</i>"; }).join("");
    h += "<button type=\"button\" role=\"option\" class=\"x-prow" + (i === (upSelected() ? lastProg : prog.idx) ? " on" : "") + "\" data-i=\"" + i + "\" aria-selected=\"" + (i === prog.idx && !upSelected()) + "\"><span class=\"x-pcol\"><b>" + esc(progFeel(p.name)) + "</b><small>" + esc(num) + "</small></span><span class=\"x-pchips\">" + chips + "</span></button>";
  });
  h += "<p class=\"x-pnote\">Picking one unloads the song and folds this list to the bar above.</p>";
  L.innerHTML = h;
}

// ---------- paint ----------
var paintT = 0;
export function paint() {
  if (!active || !built) return;
  var k = activeKey() || { pc: 0, mode: "major" };
  var kl = keyLabel(k);
  var q = document.querySelector("#xKey .x-kl"); if (q.textContent !== kl) q.textContent = kl;
  q = document.querySelector("#xStyle .x-sl"); var sn = styleName(state.style); if (q.textContent !== sn) q.textContent = sn;
  Array.prototype.forEach.call(document.querySelectorAll("#xStyleMenu .x-mi"), function (b) { var o = b.dataset.style === state.style; b.classList.toggle("on", o); b.setAttribute("aria-selected", o ? "true" : "false"); });
  Array.prototype.forEach.call(document.querySelectorAll("#xKeySheet .x-mk"), function (b) { var o = +b.dataset.pc === k.pc; b.classList.toggle("on", o); b.setAttribute("aria-checked", o ? "true" : "false"); });
  Array.prototype.forEach.call(document.querySelectorAll("#xKeySheet .x-kmode button"), function (b) { b.classList.toggle("on", b.dataset.km === k.mode); });
  $("xFull").setAttribute("aria-pressed", state.allKeys ? "true" : "false");
  $("xFull").classList.toggle("on", !!state.allKeys);
  var ps = document.querySelector("#prog .pg-song"), pon = !!(ps && ps.classList.contains("on"));
  $("xPlay").textContent = pon ? "\u25a0" : "\u25b6"; $("xPlay").setAttribute("aria-pressed", pon ? "true" : "false"); $("xPlay").setAttribute("aria-label", pon ? "Stop song" : "Play song");
  Array.prototype.forEach.call(document.querySelectorAll("#xSettings .x-set[data-proxy]"), function (b) { var o = $(b.dataset.proxy); b.classList.toggle("on", !!o && o.getAttribute("aria-checked") === "true"); b.setAttribute("aria-checked", b.classList.contains("on") ? "true" : "false"); b.setAttribute("role", "switch"); });
  Array.prototype.forEach.call(document.querySelectorAll("#xSettings [data-look]"), function (b) { b.classList.toggle("on", b.dataset.look === (pref.look === "day" ? "day" : "lamp")); });
  var v = $("volume"); if (v) { $("xVol").value = v.value; $("xVolVal").textContent = v.value; }
  var ver = $("appVersion"); if (ver) document.querySelector("#xSettings .x-ver").textContent = ver.textContent;
  paintType();
  paintSrc();
}
function schedule() { if (paintT) return; paintT = requestAnimationFrame(function () { paintT = 0; paintMode(); }); }
export function expertPaintNow() { paintMode(); }

// ---------- wire ----------
function wireAll() {
  $("xKey").addEventListener("click", function () { openOnly("xKeySheet"); paint(); });
  $("xStyle").addEventListener("click", function () { if ($("xStyleMenu").hidden) openOnly("xStyleMenu"); else closeAll(); });
  $("xStyleMenu").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-style]"); if (!b) return;
    unlock(); closeAll(); click("#styles button[data-style=\"" + b.dataset.style + "\"]"); schedule();
  });
  $("xBadge").addEventListener("click", function () { openOnly("xSettings"); paint(); });
  $("xHelp").addEventListener("click", function () { closeAll(); click("#howtoBtn"); });
  $("xNext").addEventListener("click", function () { click("#prog .pg-step"); schedule(); });
  $("xPlay").addEventListener("click", function () { click("#prog .pg-song"); schedule(); });
  $("xTog").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-v]"); if (!b) return;
    srcDo(b.dataset.v === "song" ? "tapSong" : "tapProg");
  });
  $("xSrc").addEventListener("click", function (e) {
    if (e.target.closest(".x-pbar")) { srcDo("tapBar"); return; }
    if (e.target.closest(".x-lock")) { click("#sbLock"); schedule(); return; }
    if (e.target.closest(".x-mode-song .x-songc")) click("#songBar");   // the song strip opens the song, as the classic song bar does
  });
  $("xPList").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]"); if (!b) return;
    unlock(); srcDo({ type: "pick", i: +b.dataset.i });
  });
  $("xScrim").addEventListener("click", function () { closeAll(); });
  $("xFull").addEventListener("click", function () { click("#allKeys"); schedule(); });
  $("xSound").addEventListener("click", function () {
    if (document.documentElement.classList.contains("x-ctl-on")) closeAll(); else { closeAll("ctl"); setCtlSheet(true); }
  });
  // Type bar: one tap opens / folds the table; holding it 0.3 s peeks it open until let go (mockup h).
  var tbt = 0, tbHeld = false, tbPid = null;
  $("xType").addEventListener("pointerdown", function (e) {
    if (e.button != null && e.button !== 0) return;
    tbPid = e.pointerId; tbHeld = false; clearTimeout(tbt);
    tbt = setTimeout(function () { tbt = 0; tbHeld = true; tbDo("hold"); }, TYPEBAR_HOLD_MS);
  });
  function tbUp(e) {
    if (e.pointerId !== tbPid) return;
    tbPid = null;
    if (tbt) { clearTimeout(tbt); tbt = 0; tbDo("tap"); } else if (tbHeld) tbDo("release");
    tbHeld = false;
  }
  $("xType").addEventListener("pointerup", tbUp);
  $("xType").addEventListener("pointercancel", function (e) { if (e.pointerId === tbPid) { clearTimeout(tbt); tbt = 0; if (tbHeld) tbDo("release"); tbPid = null; tbHeld = false; } });
  $("xType").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tbDo("tap"); } });
  $("xType").addEventListener("contextmenu", function (e) { e.preventDefault(); });
  // Held chord types (decision 9): label + HELD marks follow the palette holds; when the last one is let go, a peeked table folds.
  function afterPointer() { setTimeout(function () { if (!active) return; paintType(); if (!Object.keys(shared.paletteHolds || {}).length) { if (tb.foldWhenFree) tbDo("paletteFree"); } }, 0); }
  ["pointerdown", "pointerup", "pointercancel"].forEach(function (t) { document.addEventListener(t, afterPointer, true); });
  document.addEventListener("touchend", afterPointer, true);
  // Key sheet
  $("xKeySheet").addEventListener("click", function (e) {
    var k = activeKey() || { pc: 0, mode: "major" };
    var m = e.target.closest(".x-mk"); if (m) { unlock(); setKidKey(+m.dataset.pc, k.mode); schedule(); return; }
    var md = e.target.closest("[data-km]"); if (md) { setKidKey(k.pc, md.dataset.km); schedule(); return; }
    if (e.target.closest(".x-close")) closeAll();
  });
  // Settings sheet
  $("xSettings").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.classList.contains("x-close")) { closeAll(); return; }
    if (b.dataset.mode) { setMode(b.dataset.mode); return; }
    if (b.dataset.proxy) { click("#" + b.dataset.proxy); schedule(); return; }
    if (b.dataset.look) { pref.look = b.dataset.look; savePref(); paintMode(); return; }
    var act = b.dataset.act;
    if (act === "upload") { closeAll(); click("#uploadBtn"); }
    else if (act === "howto") { closeAll(); click("#howtoBtn"); }
    else if (act === "tour") { closeAll(); click("#tourBtn"); }
    else if (act === "reset") { if (window.confirm("Start over? This resets every setting (your songs stay).")) { closeAll(); click("#factoryReset"); schedule(); } }
  });
  // Gear-menu mode switch (classic screens)
  document.querySelector(".x-gearmode").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-mode]"); if (!b) return;
    e.stopPropagation();
    var m = $("configMenu"); if (m) m.hidden = true; var c = $("configBtn"); if (c) c.setAttribute("aria-expanded", "false");
    setMode(b.dataset.mode);
  });
  $("xVol").addEventListener("input", function () { var v = $("volume"); v.value = $("xVol").value; v.dispatchEvent(new Event("input", { bubbles: true })); $("xVolVal").textContent = v.value; });
  $("xVol").addEventListener("change", function () { var v = $("volume"); v.value = $("xVol").value; v.dispatchEvent(new Event("change", { bubbles: true })); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && active) closeAll(); });
  // Repaint when the app changes underneath (style / Simple / song / step / key / Play state).
  document.addEventListener("click", function () { setTimeout(schedule, 0); }, true);
  if (window.MutationObserver) {
    var mo = new MutationObserver(schedule);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    ["symbol", "songBar", "styles", "prog", "kidKey"].forEach(function (id) { var n = $(id); if (n) mo.observe(n, { attributes: true, childList: true, subtree: true, characterData: true }); });
  }
  setInterval(function () { if (active && prog.playing) paintSrc(); }, 400);
  var rz = 0;
  function onResize() { clearTimeout(rz); rz = setTimeout(function () { if (!active) return; placeTog(); placeSheets(); fitStrip(); placeBadges(); fitNowSymbol(); }, 80); }
  window.addEventListener("resize", onResize); window.addEventListener("orientationchange", onResize);
}

// Boot (from main.js, after the app's own boot: saved settings applied, first song set).
export function boot() {
  pref = prefFromUrl(location.search, loadPref());
  var urlOn = /[?&]expert=1(&|$)/.test(location.search);
  if (/[?&]expert=[01](&|$)/.test(location.search)) savePref();
  guardTouches();
  watchMarks();
  setModeHandler(setMode);
  // rd2 (Uiux #3): in Expert a step badge keeps off the other chips' tiles (e.g. the 3 on Am no longer sits on A / vi)
  setBadgeAvoid(function (strip) {
    if (!active) return [];
    return Array.prototype.map.call(strip.querySelectorAll(".ss-chip, .ss-note"), function (n) { var q = n.getBoundingClientRect(); return { el: n, left: q.left, top: q.top, right: q.right, bottom: q.bottom }; });
  });   // the Kids view's own Kids / Simple / Expert row goes through the same switch
  tb = typeBarInit(false);
  src = sourceInit(srcCtx());
  build();
  wireAll();
  placeTog();
  if (urlOn && currentMode() !== "expert") setMode("expert");   // ?expert=1 opens Expert, also on a first visit (else the Kids view)
  paintMode();
  setTimeout(function () { if (active) { placeTog(); placeSheets(); fitStrip(); placeBadges(); fitNowSymbol(); } }, 60);
}
