// rd15: short landscape (phones held sideways: 780x360, 844x390, 915x412, 740x360) has no keyboard header strip. Per view
// (Octave / Full / Buttons) and look (Day / Lamp): the keys start at the panel's top; Buttons rows >= 24px with ~2px gaps;
// Octave / Full keys no shorter than rd14 (RD14=<5517105 server>); the Keys chip is a full-width button in the right-hand
// column under Full Range / Sound and the column ends with the chord grid (it did not grow); SUSTAIN 40px; every key
// point hit-tests to its key (never the chip, the pill or anything else); a key's label stays inside its key (or is
// clipped by it); a real touch on the enable-sound pill presses (and sounds) the key under it. The landscape top bar is
// one height (36px: Key, Style, the track, ◆ Expert, ?) and "?" keeps a 44px tap area clear of ◆ Expert. Upright phones
// and iPad keep rd14's strip and boxes. The equal-height audit runs at 780x360, 844x390, 915x412 for Kids / Simple /
// Expert, Day and Lamp.   node -r ./emulate.cjs rd15.cjs   env BASE, RD14, OUT, CMP (before / after shots), SZ, NO_EQH
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const URL = process.env.URL || process.env.BASE || 'http://localhost:8080/index.html'; const RD14 = process.env.RD14 || '';
const OUT = process.env.OUT || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const CMP = process.env.CMP || ''; if (CMP) fs.mkdirSync(CMP, { recursive: true });
const R = { fails: [], data: {} }; const F = (c, m) => { if (!c) R.fails.push(m); };
const V13 = fs.readFileSync(path.join(__dirname, '../fixtures/upload/anh-v13.json'), 'utf8');
const V12 = fs.readFileSync(path.join(__dirname, '../fixtures/upload/anh-v12.json'), 'utf8');
const SLK = 'touchChord.simpleLook.v1', LK = look => ({ ls: { [SLK]: { v: 1, look } } });
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}#dev-badge{visibility:hidden!important}';
const CONTRAST = function (groups) {
  function parse(c) { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  function over(f, b) { const a = f.a + b.a * (1 - f.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (f.r * f.a + b.r * b.a * (1 - f.a)) / a, g: (f.g * f.a + b.g * b.a * (1 - f.a)) / a, b: (f.b * f.a + b.b * b.a * (1 - f.a)) / a, a }; }
  function lum(c) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
  function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function bgOf(el) { // composite the backgrounds from the root down to el
    const chain = []; for (let e = el; e; e = e.parentElement) chain.push(e);
    let c = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = chain.length - 1; i >= 0; i--) { const cs = getComputedStyle(chain[i]); const b = parse(cs.backgroundColor); if (b && b.a > 0) c = over(b, c); const o = +cs.opacity; }
    return c;
  }
  function parentBg(el) { return el.parentElement ? bgOf(el.parentElement) : { r: 255, g: 255, b: 255, a: 1 }; }
  const vis = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0.3 && !e.closest('[hidden]');
  const out = { text: [], ctrl: [], n: { text: 0, ctrl: 0 } };
  for (const [name, sel, kind] of groups) {
    for (const el of document.querySelectorAll(sel)) {
      if (!vis(el)) continue;
      if (kind !== 'ctrl') { // text: every text node directly in el
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (!own) continue;
        const cs = getComputedStyle(el), fg = parse(cs.color), bg = bgOf(el), fs = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
        const need = fs >= 24 || (bold && fs >= 18.66) ? 3 : 4.5, r = ratio(over(fg, bg), bg);
        out.n.text++; if (r < need - 0.005) out.text.push({ g: name, t: el.textContent.trim().slice(0, 20), r: +r.toFixed(2), need, fg: cs.color, bg: `rgb(${bg.r|0},${bg.g|0},${bg.b|0})` });
      } else {
        const cs = getComputedStyle(el), bgc = parse(cs.backgroundColor), hasB = parseFloat(cs.borderTopWidth) >= 1 && cs.borderTopStyle !== 'none' && parse(cs.borderTopColor).a > 0, hasS = /inset/.test(cs.boxShadow);
        if ((!bgc || bgc.a === 0) && !hasB && !hasS) continue;   // a text / icon button inside its group: the group is the control
        const pb = parentBg(el), own = over(parse(cs.backgroundColor) || { r: 0, g: 0, b: 0, a: 0 }, pb);
        const bw = parseFloat(cs.borderTopWidth), bc = bw >= 1 && cs.borderTopStyle !== 'none' ? over(parse(cs.borderTopColor), pb) : null;
        let sc = null; if (hasS) { const m = cs.boxShadow.match(/rgba?\([^)]+\)/); if (m) sc = over(parse(m[0]), own); }
        const r = Math.max(ratio(own, pb), bc ? ratio(bc, pb) : 1, sc ? Math.min(ratio(sc, own), ratio(sc, pb)) : 1);
        out.n.ctrl++; if (r < 3 - 0.005) out.ctrl.push({ g: name, t: (el.textContent || el.id || el.className).trim().slice(0, 20), r: +r.toFixed(2), bg: cs.backgroundColor, border: bc ? cs.borderTopColor : null, under: `rgb(${pb.r|0},${pb.g|0},${pb.b|0})` });
      }
    }
  }
  return out;
};
;
const SET = {   // saved setups
  kids: { s: { expert: false, playAlong: true } },
  simple: { s: { expert: true, simple: true, style: 'pop' } },
  expert: { s: { expert: true, simple: false, style: 'pop' }, x: { on: true } },
  full: { s: { expert: true, simple: false, style: 'pop', layout: 'octave', theme: 'day' } },   // a pre-redesign Full setup (no Expert pref)
};
async function open(b, w, h, setup, q, opt = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const ls = setup ? `localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:${JSON.stringify(setup.s)}}));` + (setup.x ? `localStorage.setItem('touchChord.expert.v1',${JSON.stringify(JSON.stringify(setup.x))});` : '') : '';
  const extra = opt.ls ? Object.entries(opt.ls).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(JSON.stringify(v))});`).join('') : '';
  await ctx.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');${ls}${extra}}}catch(e){}`);
  const p = await ctx.newPage(); p.__errs = [];
  p.on('pageerror', e => p.__errs.push('' + e)); p.on('console', m => { if (m.type() === 'error') p.__errs.push(m.text()); });
  if (opt.at) await p.clock.setFixedTime(new Date(opt.at));
  await p.goto(URL + (q == null ? '?test=1&hour=12' : q)); await p.waitForTimeout(1300);
  p.__cdp = await ctx.newCDPSession(p);
  return p;
}
const done = async (p, tag) => { for (const e of p.__errs) F(false, `${tag}: page error ${e}`); await p.context().close(); };
const rectOf = (p, sel) => p.evaluate(s => { const e = typeof s === 'string' ? [...document.querySelectorAll(s)].find(x => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden') : null; if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2, l: q.left, t: q.top, r: q.right, b: q.bottom }; }, sel);
async function touch(p, x, y, ms) { await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await p.waitForTimeout(ms); await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(150); }
async function tap(p, sel, ms = 60) { const r = await rectOf(p, sel); if (!r) return false; await touch(p, r.x, r.y, ms); return true; }
const chipSel = '.mode-chip';
async function openSheet(p, mode) { await tap(p, chipSel, mode === 'kids' ? 1150 : 60); await p.waitForTimeout(250); return p.evaluate(() => !document.getElementById('modeSheet').hidden); }
async function switchTo(p, from, to) { if (!(await openSheet(p, from))) return 'sheet did not open from ' + from; await tap(p, `#msMode button[data-mode="${to}"]`); await p.waitForTimeout(600); return null; }
const probe = p => p.evaluate(() => { const v = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0.05;
  const chips = [...document.querySelectorAll('.mode-chip')].filter(v).map(e => { const r = e.getBoundingClientRect(); return { m: e.dataset.modeChip, t: e.textContent.trim(), x: r.x, y: r.y, w: r.width, h: r.height }; });
  return { mode: window.__xmode ? __xmode.mode() : null, chips, old: [...document.querySelectorAll('.kv-gear, #simpleBtn, #configBtn, #xBadge, .x-gearmode, #kvSettings, #xSettings')].filter(v).map(e => e.id || e.className),
    sheet: !document.getElementById('modeSheet') || !document.getElementById('modeSheet').hidden ? !!document.getElementById('modeSheet') : false,
    kidsStyle: [...document.querySelectorAll('#styles button[data-style="kids"]')].filter(v).length,
    style: (document.querySelector('#styles button.on[data-style]') || {}).dataset ? document.querySelector('#styles button.on[data-style]').dataset.style : null,
    kv: document.documentElement.classList.contains('kv'), kvLamp: document.documentElement.classList.contains('kv-lamp'),
    xLamp: document.documentElement.classList.contains('x-lamp'), xDay: document.documentElement.classList.contains('x-day'),
    screen: (document.getElementById('kv') || {}).dataset ? document.getElementById('kv').dataset.screen : null,
    song: window.__prog && __prog.list[__prog.idx] ? __prog.list[__prog.idx].name : null, pos: window.__magic ? __magic.state.pos : null,
    note: (() => { const n = document.getElementById('xDenseNote'); return n && v(n) ? n.textContent.replace('\u2715', '').trim() : null; })() }; });
const G = [['chips', '#suggest .ss-chip, #suggest .ss-note', 'ctrl'], ['chip text', '#suggest .ss-chip, #suggest .ss-chip *, #suggest .ss-note, #suggest .ss-note *', 'text'],
  ['lyrics / song bar', '#songBar, #songBar *', 'text'], ['pads', '.kb .pad, .kb .white, .kb .black', 'ctrl'], ['pad text', '.kb .pad, .kb .pad *', 'text'],
  ['controls', 'header.topbar button, #styles button, .now-col button, #ctl button, #prog button, .mode-chip, #keyRow button', 'ctrl'],
  ['control text', 'header.topbar *, #styles button, .now-col *, #ctl *, #prog *, .mode-chip *', 'text'], ['badges', '.pg-badge, .ss .pg-badge', 'text']];
const GS = [['sheet', '#modeSheet *', 'text'], ['sheet controls', '#modeSheet .ms-x, #modeSheet .ms-mode, #modeSheet .ms-seg, #modeSheet .ms-pair button, #modeSheet .ms-tg', 'ctrl']];
const cls = p => p.evaluate(() => ({ day: document.documentElement.classList.contains('s-day'), lamp: document.documentElement.classList.contains('s-lamp') }));
const lyr = p => p.evaluate(() => { const M = __lyr2.map(), st = __upload.steps(); let t = 0; return M.at.map((k, i) => { const o = { t, text: M.seq[k].text }; t += st[i].bars || 1; return o; }); });
async function openClock(b, w, h, setup, time, q, ls) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const s = `localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:${JSON.stringify(setup.s)}}));` + (ls ? `localStorage.setItem('${SLK}',${JSON.stringify(JSON.stringify(ls))});` : '');
  await ctx.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');${s}}}catch(e){}`);
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', e => p.__errs.push('' + e)); p.on('console', m => { if (m.type() === 'error') p.__errs.push(m.text()); });
  await p.clock.install({ time: new Date(time) }); await p.goto(URL + (q || '?test=1')); await p.waitForTimeout(1300); p.__cdp = await ctx.newCDPSession(p); return p;
}
async function contrast(p) { await p.addScriptTag({ content: 'window.__contrast = ' + CONTRAST.toString() }); const a = await p.evaluate(g => __contrast(g), G); return a; }
async function sheetContrast(p) { await p.addScriptTag({ content: 'window.__contrast = ' + CONTRAST.toString() }); return p.evaluate(g => __contrast(g), GS); }
const LAY = { octave: 'octave', full: 'full', buttons: 'fourths' };
const XS = k => ({ s: Object.assign({}, SET.expert.s, { layout: LAY[k] }), x: SET.expert.x });
const hit = p => p.evaluate(() => { const box = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const pads = [...document.querySelectorAll('#pads .pad')], blacks = pads.filter(e => e.classList.contains('black')), bad = []; let pts = 0;
  for (const k of pads) { const r = box(k); if (r.w < 2 || r.h < 2) { bad.push(`${k.dataset.midi} zero box`); continue; }
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const ix = Math.min(5, r.w * 0.15), iy = Math.min(5, r.h * 0.15), x = r.l + ix + (r.w - 2 * ix) * i / 4, y = r.t + iy + (r.h - 2 * iy) * j / 4; pts++;   // 5px in from the edges (the rounded corners are not the key)
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) { bad.push(`${k.dataset.midi} @${Math.round(x)},${Math.round(y)} off screen`); continue; }
      const e = document.elementFromPoint(x, y), on = e && e.closest('.pad');
      if (on === k) continue;
      if (on && k.classList.contains('white') && on.classList.contains('black') && blacks.includes(on)) continue;   // under a black key
      bad.push(`${k.dataset.midi} @${Math.round(x)},${Math.round(y)} -> ${e ? (e.id ? '#' + e.id : e.className || e.tagName) : 'null'}`); } }
  const c = document.getElementById('xKeysChip'), u = document.getElementById('unlock'), kt = Math.min(...pads.map(e => e.getBoundingClientRect().top));
  return { n: pads.length, pts, bad, chip: c && box(c), pill: u && !u.hidden && u.getClientRects().length ? box(u) : null, keysTop: kt, wrap: box(document.querySelector('.kb-wrap')), grid: box(document.querySelector('.next-card')), pads: box(document.getElementById('pads')) }; });
const ov = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
const EQH = require('./eqh-lib.cjs'), ST = require('./eqh-states.cjs');
const LAND = [[780, 360], [844, 390], [915, 412], [740, 360]];
const geo = p => p.evaluate(() => { const box = s => { const e = typeof s === 'string' ? document.querySelector(s) : s; if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const pads = [...document.querySelectorAll('#pads .pad')], c = document.getElementById('xKeysChip');
  const rows = [...new Set(pads.map(e => Math.round(e.getBoundingClientRect().top * 2) / 2))].sort((a, b) => a - b);
  const clip = pads.map(k => { const n = k.querySelector('.nm'); if (!n || !n.getClientRects().length) return null; const a = k.getBoundingClientRect(), r = n.getBoundingClientRect();
    if (getComputedStyle(k).overflow !== 'visible') return null;   // clipped to the key
    return r.left < a.left - 0.5 || r.right > a.right + 0.5 || r.top < a.top - 0.5 || r.bottom > a.bottom + 0.5 ? `${k.dataset.midi} label ${Math.round(r.top)}..${Math.round(r.bottom)} vs key ${Math.round(a.top)}..${Math.round(a.bottom)}` : null; }).filter(Boolean);
  return { padH: Math.min(...pads.map(e => e.getBoundingClientRect().height)), rows, chipIn: c && c.parentElement ? (c.parentElement.id || c.parentElement.className) : null, chip: box(c), ctl: box('#xCtl'), full: box('#xFull'), snd: box('#xSound'), sus: box('#sustainBtn'), grid: box('.next-card'), wrap: box('.kb-wrap'), pads: box('#pads'), clip }; });
const topbar = p => p.evaluate(() => { const box = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const o = {}; ['#xKey', '#xStyle', '#xTog', '#xModeChip', '#xHelp'].forEach(s => o[s] = box(s));
  const h = o['#xHelp'], at = (x, y) => { const e = document.elementFromPoint(x, y); return e ? (e.closest('#xHelp') ? 'help' : e.closest('#xModeChip') ? 'chip' : (e.id || e.className || e.tagName)) : null; };
  const cx = (h.l + h.r) / 2, cy = (h.t + h.b) / 2, m = o['#xModeChip'];
  o.tap = { left: at(cx - 21.5, cy), right: at(Math.min(innerWidth - 0.5, cx + 21.5), cy), top: at(cx, cy - 21.5), bottom: at(cx, cy + 21.5), chipEdge: at(m.r - 1, (m.t + m.b) / 2) };
  o.ringL = cx - 22; return o; });
async function pillTap(p) {   // a real touch on the enable-sound pill: the key under it is pressed and sounds
  await p.evaluate(() => { window.__plays = 0; const A = window.ChordAudio; ['playChord', 'morphChord', 'playNote'].forEach(k => { if (typeof A[k] === 'function') { const f = A[k].bind(A); A[k] = function () { window.__plays++; return f.apply(null, arguments); }; } });
    window.__held = null; new MutationObserver(ms => ms.forEach(m => { if (m.target.classList && m.target.classList.contains('held') && m.target.closest('#pads')) window.__held = window.__held || m.target.dataset.midi; })).observe(document.getElementById('pads'), { attributes: true, subtree: true, attributeFilter: ['class'] }); });
  const u = await p.evaluate(() => { const e = document.getElementById('unlock'); if (!e || e.hidden || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); let x = r.left + r.width / 2, y = r.top + r.height / 2;
    for (let i = 0; i <= 16; i++) { const tx = r.left + 8 + (r.width - 16) * ((i * 7) % 17) / 16, el = document.elementFromPoint(tx, y); if (el && el.closest('#pads .pad') && !/\b(out|nokey)\b/.test(el.closest('#pads .pad').className)) { x = tx; break; } }   // a point of the pill over a key that sounds (not a gap; out-of-key keys are silent by design)
    const under = document.elementFromPoint(x, y); return { x, y, pe: getComputedStyle(e).pointerEvents, under: under && under.closest('.pad') ? under.closest('.pad').dataset.midi : (under ? under.id || under.className : null) }; });
  if (!u) return { pill: false }; u.pill = true;
  await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: u.x, y: u.y }] }); await p.waitForTimeout(250);
  await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(250);
  return Object.assign(u, await p.evaluate(() => ({ plays: window.__plays, held: window.__held, gone: (e => !e || e.hidden || !e.getClientRects().length || getComputedStyle(e).opacity < 0.05)(document.getElementById('unlock')) }))); }
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  const sizes = process.env.SZ ? process.env.SZ.split(',').map(x => x.split('x').map(Number)) : LAND;
  for (const [w, h] of sizes) { const T = `${w}x${h}`, D = R.data[T] = {};
    for (const k of ['buttons', 'octave', 'full']) for (const hour of [12, 22]) { const tag = `${T} ${k} ${hour === 12 ? 'day' : 'lamp'}`;
      const p = await open(b, w, h, XS(k), `?test=1&hour=${hour}`); const g = await hit(p), q = await geo(p);
      const d = D[k + (hour === 12 ? '' : ' lamp')] = { keys: g.n, bad: g.bad.length, keyH: Math.round(q.padH * 10) / 10, top: Math.round(q.pads.t - q.wrap.t), chip: q.chip && Math.round(q.chip.h) };
      F(g.n >= 12 && g.pts === g.n * 25, `${tag}: ${g.n} keys / ${g.pts} points`);
      F(!g.bad.length, `${tag}: ${g.bad.length} key points not on their key: ${g.bad.slice(0, 6).join('; ')}`);
      F(q.pads.t - q.wrap.t <= 4, `${tag}: a header above the keys (${q.pads.t - q.wrap.t}px)`);
      if (k === 'buttons') { const gaps = q.rows.slice(1).map((y, i) => y - q.rows[i] - q.padH); d.rows = q.rows.length; d.gap = Math.round(Math.max(...gaps) * 10) / 10;
        F(q.rows.length === 4 && q.padH >= 24, `${tag}: Buttons rows ${q.padH}px (${q.rows.length} rows), want >= 24`); F(gaps.every(x => x <= 2.6), `${tag}: Buttons row gaps ${gaps}`); }
      F(q.chipIn === 'xCtl' && q.chip && q.ctl && Math.abs(q.chip.w - q.ctl.w) <= 1 && q.chip.t >= Math.max(q.full.b, q.snd.b) - 0.5 && q.chip.b <= q.ctl.b + 0.5 && q.chip.h >= 26, `${tag}: Keys chip not a full-width button under Full Range / Sound ${JSON.stringify([q.chipIn, q.chip, q.ctl, q.full])}`);
      F(q.ctl.b <= q.grid.b + 0.5 && !ov(q.chip, q.pads) && !ov(q.chip, q.wrap), `${tag}: the column grew past the chord grid or the chip meets the keys ${JSON.stringify([q.ctl, q.grid, q.wrap])}`);
      F(Math.round(q.sus.h) === 40, `${tag}: SUSTAIN ${q.sus.h}px, want 40`);
      F(Math.abs(q.full.h - q.snd.h) <= 0.5, `${tag}: Full Range ${q.full.h} vs Sound ${q.snd.h}`);
      F(!q.clip.length, `${tag}: labels past their keys: ${q.clip.slice(0, 4).join('; ')}`);
      if (hour === 12 && RD14 && k !== 'buttons') { const p0 = await open(b, w, h, XS(k), '?test=1&hour=12'); await p0.goto(RD14 + '?test=1&hour=12'); await p0.waitForTimeout(1300); const q0 = await geo(p0);
        d.rd14keyH = Math.round(q0.padH * 10) / 10; F(q.padH >= q0.padH - 0.5, `${tag}: keys ${q.padH}px, rd14 ${q0.padH}px`); await p0.context().close(); }
      if (hour === 12 && RD14 && k === 'buttons') { const p0 = await open(b, w, h, XS(k), '?test=1&hour=12'); await p0.goto(RD14 + '?test=1&hour=12'); await p0.waitForTimeout(1300); const q0 = await geo(p0); d.rd14keyH = Math.round(q0.padH * 10) / 10; await p0.context().close(); }
      if (hour === 12) { const t = await pillTap(p); d.pill = t;
        F(t.pill && t.pe === 'none' && /^\d+$/.test(t.under), `${tag}: pill ${JSON.stringify(t)} (not pointer-events none over a key)`);
        F(t.pill && t.held === t.under && t.plays > 0, `${tag}: a tap on the pill did not press / sound key ${t.under}: ${JSON.stringify(t)}`); }
      await done(p, tag); }
    for (const hour of [12, 22]) { const tag = `${T} top bar ${hour === 12 ? 'day' : 'lamp'}`; const p = await open(b, w, h, XS('octave'), `?test=1&hour=${hour}`); const o = await topbar(p); R.data[tag] = o;
      const hs = ['#xKey', '#xStyle', '#xTog', '#xModeChip', '#xHelp'].map(s => o[s] && Math.round(o[s].h * 10) / 10), cs = ['#xKey', '#xStyle', '#xTog', '#xModeChip', '#xHelp'].map(s => o[s] && Math.round((o[s].t + o[s].b)));
      F(hs.every(x => x === 36) && cs.every(x => Math.abs(x - cs[0]) <= 1), `${tag}: heights ${hs} centres ${cs} (want one 36px row)`);
      F(Math.abs(o['#xHelp'].w - 36) <= 0.5, `${tag}: ? drawn ${o['#xHelp'].w}x${o['#xHelp'].h}`);
      F(['left', 'right', 'top', 'bottom'].every(s => o.tap[s] === 'help') && o.tap.chipEdge === 'chip' && o.ringL >= o['#xModeChip'].r - 0.5, `${tag}: ? tap area ${JSON.stringify(o.tap)} ring left ${o.ringL} vs ◆ Expert right ${o['#xModeChip'].r}`);
      await done(p, tag); }
    if (CMP && T === '780x360' && RD14) for (const k of ['buttons', 'octave']) { const p = await open(b, w, h, XS(k), '?test=1&hour=12'), p0 = await open(b, w, h, XS(k), '?test=1&hour=12'); await p0.goto(RD14 + '?test=1&hour=12'); await p0.waitForTimeout(1300);
      await p0.screenshot({ path: path.join(CMP, `${T}-${k}-before-rd14.png`) }); await p.screenshot({ path: path.join(CMP, `${T}-${k}-after-rd15.png`) });
      if (k === 'octave') { await p0.screenshot({ path: path.join(CMP, `${T}-topbar-before-rd14.png`), clip: { x: 0, y: 0, width: w, height: 46 } }); await p.screenshot({ path: path.join(CMP, `${T}-topbar-after-rd15.png`), clip: { x: 0, y: 0, width: w, height: 46 } }); }
      await p.context().close(); await p0.context().close(); }
    console.log(T, R.fails.length); }
  if (!RD14) F(false, 'RD14 not set (keys vs rd14 not checked)');
  // upright phones and iPad: rd14's strip, the chip in it, the same panel / grid / keys as rd14
  if (!process.env.SZ) for (const [w, h] of [[360, 780], [412, 915], [820, 1180], [1180, 820]]) for (const k of ['buttons', 'octave']) { const tag = `${w}x${h} ${k} (as rd14)`;
    const p = await open(b, w, h, XS(k), '?test=1&hour=12'); const q = await geo(p), g = await hit(p);
    F(q.chipIn !== 'xCtl' && /kb-wrap/.test(q.chipIn || ''), `${tag}: chip in ${q.chipIn}`); F(!g.bad.length, `${tag}: ${g.bad.length} key points not on their key ${g.bad.slice(0, 3)}`);
    if (RD14) { const p0 = await open(b, w, h, XS(k), '?test=1&hour=12'); await p0.goto(RD14 + '?test=1&hour=12'); await p0.waitForTimeout(1300); const q0 = await geo(p0);
      const pick = x => JSON.stringify([x.chip, x.wrap, x.pads, x.grid, x.sus, x.padH]);
      F(pick(q) === pick(q0), `${tag}: differs from rd14 ${pick(q)} vs ${pick(q0)}`); await p0.context().close(); }
    await done(p, tag); }
  // equal heights in short landscape: Kids, Simple, Expert, Day and Lamp
  if (!process.env.NO_EQH) { const D = R.data.eqh = { checked: 0, rows: 0, bad: [] };
    for (const [w, h] of [[780, 360], [844, 390], [915, 412]]) for (const m of ['kids', 'simple', 'expert']) for (const hour of [12, 22]) for (const [nm, act] of ST[m]) {
      const p = await open(b, w, h, m === 'expert' ? XS('octave') : SET[m], `?test=1&hour=${hour}`); await act(p);
      const r = await p.evaluate(`(${EQH.toString()})()`); D.checked++; D.rows += r.rows;
      r.bad.forEach(x => { const s = `${w}x${h} ${m} ${hour === 12 ? 'day' : 'lamp'} ${nm}: ${x.items.join(' | ')}`; D.bad.push(s); F(false, 'equal heights ' + s); });
      await done(p, `eqh ${w}x${h} ${m} ${nm}`); }
    F(D.checked >= 140 && D.rows > 250, `equal heights: only ${D.checked} screens / ${D.rows} rows checked`); }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'rd15.json'), JSON.stringify(R, null, 1));
  console.log(R.fails.length ? 'FAIL ' + R.fails.length + '\n' + R.fails.join('\n') : 'PASS', JSON.stringify(R.data).slice(0, 6000));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
