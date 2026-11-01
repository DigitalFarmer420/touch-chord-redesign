// rd13: (1) Expert Keys: the Settings sheet's Keys row (first under Playing, Expert only: Octave · Full · Buttons) and the
// play panel's corner chip (shows the pick, one tap = the next); persistence across mode switches and reloads; saved
// layouts map to their view (nothing saved = Octave); the panel keeps one height; Octave slides with a chord and snaps
// back to the tonic; keys rise left to right from the root; a chord sounds the same in all three; Kids / Simple untouched.
// (2) Equal heights: every row of side-by-side controls at 360x780, 384x832, 412x915 (Kids / Simple / Expert, Day / Lamp,
// every screen / sheet / panel in eqh-states.cjs) differs by <= 1px.   node -r ./emulate.cjs rd13.cjs   env BASE, OUT, CMP
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const URL = process.env.URL || process.env.BASE || 'http://localhost:8080/index.html'; 
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
const EQH = require('./eqh-lib.cjs'), ST = require('./eqh-states.cjs');
const LAB = { octave: 'Octave', full: 'Full', buttons: 'Buttons' }, ORD = ['octave', 'full', 'buttons'];
const XS = lay => ({ s: Object.assign({}, SET.expert.s, lay ? { layout: lay } : {}), x: SET.expert.x });
const kb = p => p.evaluate(() => { const q = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const pads = [...document.querySelectorAll('#pads .pad')].map(e => { const r = e.getBoundingClientRect(); return { m: +e.dataset.midi, x: r.left + r.width / 2, y: r.top + r.height / 2, held: e.classList.contains('held') }; });
  const c = document.getElementById('xKeysChip'), cv = c && c.getClientRects().length && getComputedStyle(c).display !== 'none';
  let ls = null; try { ls = JSON.parse(localStorage.getItem('touchChord.settings.v1')).settings.layout; } catch (e) {}
  return { pick: window.__xmode && __xmode.keys(), cls: document.getElementById('pads').className, n: pads.length, pads, wrap: q('.kb-wrap'), grid: q('.next-card'), chip: cv ? { t: c.textContent.replace('\u21bb', '').trim(), ...q('#xKeysChip') } : null, ls, win: window.__kbWin ? __kbWin().lo : null }; });
async function chipHold(p, name, fn) { const r = await p.evaluate(n => { const e = [...document.querySelectorAll('#suggest .ss-chip')].find(x => x.getClientRects().length && x.textContent.replace(/\s+/g, '').startsWith(n)); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, name);
  if (!r) return null; await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] }); await p.waitForTimeout(350);
  const v = await fn(); await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(120); return v; }
const sounding = p => p.evaluate(() => (__xMarks.sounding() || []).slice().sort((a, b) => a - b));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  // 1. sheet row: Expert only, first under Playing; the segment's three choices
  for (const m of ['kids', 'simple', 'expert']) { const tag = `keys row ${m}`;
    const p = await open(b, 360, 780, m === 'expert' ? XS() : SET[m]); await p.evaluate(() => __ms.open(true)); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const row = document.querySelector('#modeSheet [data-row="keys"]'); const vis = !!row && !row.hidden && !!row.getClientRects().length;
      const rows = [...document.querySelectorAll('#modeSheet [data-row]')].filter(e => !e.hidden && e.getClientRects().length).map(e => e.dataset.row);
      const prev = row && row.previousElementSibling; return { vis, rows, after: prev && prev.className + ':' + prev.textContent.trim(), seg: row ? [...row.querySelectorAll('#msKeys button')].map(b => b.textContent + (b.classList.contains('on') ? '*' : '')) : [], t: row && row.querySelector('.ms-t').childNodes[0].textContent }; });
    R.data[tag] = r;
    if (m === 'expert') { F(r.vis && r.rows[0] === 'mode' && r.rows[1] === 'keys' && /ms-lbl:Playing/.test(r.after) && r.t === 'Keys', `${tag}: ${JSON.stringify(r)}`);
      F(JSON.stringify(r.seg) === '["Octave*","Full","Buttons"]', `${tag}: segment ${r.seg}`); }
    else F(!r.vis && !r.rows.includes('keys'), `${tag}: shown outside Expert ${JSON.stringify(r)}`);
    const k = await kb(p); if (m !== 'expert') F(!k.chip, `${tag}: Keys chip shown in ${m}`);
    await done(p, tag);
  }
  // 2. saved layouts map to their view; nothing saved = Octave
  for (const [lay, want, cls, n] of [[null, 'octave', 'kb piano', 12], ['octave', 'octave', 'kb piano', 12], ['piano', 'octave', 'kb piano', 12], ['full', 'full', 'kb piano', 25], ['fourths', 'buttons', 'kb fourths', 24]]) {
    const tag = `default ${lay || 'nothing saved'}`; const p = await open(b, 360, 780, XS(lay)); const k = await kb(p);
    F(k.pick === want && k.cls === cls && k.n === n && k.chip && k.chip.t === LAB[want], `${tag}: ${k.pick} ${k.cls} ${k.n} chip ${k.chip && k.chip.t}`); R.data[tag] = k.pick; await done(p, tag); }
  // 3. chip cycles; sheet and chip agree; panel height and the chord grid stay put; saved per device
  for (const [w, h] of [[360, 780], [1180, 820]]) { const T = `${w}x${h}`, D = R.data[T] = {};
    const p = await open(b, w, h, XS()); let k0 = await kb(p); const seen = [];
    F(k0.chip && k0.wrap.x + k0.wrap.w - (k0.chip.x + k0.chip.w) >= 0 && k0.wrap.x + k0.wrap.w - (k0.chip.x + k0.chip.w) <= 8 && k0.chip.y - k0.wrap.y >= 0 && k0.chip.y - k0.wrap.y <= 4, `${T}: chip not at the panel's top right ${JSON.stringify([k0.chip, k0.wrap])}`);   // rd14: in the header strip's right end
    for (let i = 0; i < 3; i++) { const k = await kb(p); seen.push(k.pick);
      F(JSON.stringify(k.wrap) === JSON.stringify(k0.wrap) && JSON.stringify(k.grid) === JSON.stringify(k0.grid), `${T} ${k.pick}: panel / grid moved ${JSON.stringify([k.wrap, k.grid])} vs ${JSON.stringify([k0.wrap, k0.grid])}`);
      F(k.chip && k.chip.t === LAB[k.pick], `${T}: chip says ${k.chip && k.chip.t} for ${k.pick}`);
      if (CMP) await p.screenshot({ path: path.join(CMP, `${T}-expert-${k.pick}.png`) });
      await tap(p, '#xKeysChip'); await p.waitForTimeout(400); }
    const k3 = await kb(p); seen.push(k3.pick); D.cycle = seen;
    F(JSON.stringify(seen) === '["octave","full","buttons","octave"]', `${T}: chip cycle ${seen}`);
    await done(p, `${T} cycle`);
  }
  // 4. persistence: pick in the sheet, then reload, Simple, Kids, back to Expert
  { const tag = 'persist'; const p = await open(b, 360, 780, XS()); const D = R.data[tag] = {};
    await openSheet(p, 'expert'); await tap(p, '#msKeys button[data-keys="buttons"]'); await p.waitForTimeout(400);
    let k = await kb(p); D.sheet = k.pick; F(k.pick === 'buttons' && k.cls === 'kb fourths', `${tag}: sheet pick ${k.pick} ${k.cls}`);
    const sh = await p.evaluate(() => [...document.querySelectorAll('#msKeys button.on')].map(b => b.dataset.keys)); F(sh.join() === 'buttons', `${tag}: sheet shows ${sh}`);
    await p.evaluate(() => __ms.open(false)); await p.waitForTimeout(400); k = await kb(p); F(k.ls === 'fourths', `${tag}: not saved (${k.ls})`);
    await p.reload(); await p.waitForTimeout(1400); k = await kb(p); D.reload = k.pick; F(k.pick === 'buttons' && k.cls === 'kb fourths', `${tag}: after reload ${k.pick} ${k.cls}`);
    let e = await switchTo(p, 'expert', 'simple'); F(!e, `${tag}: ${e}`); k = await kb(p); D.simple = [k.cls, k.n]; F(k.cls === 'kb piano' && k.n <= 13 && !k.chip, `${tag}: Simple keys changed ${k.cls} ${k.n}`);
    e = await switchTo(p, 'simple', 'kids'); F(!e, `${tag}: ${e}`); await p.waitForTimeout(400);
    e = await switchTo(p, 'kids', 'expert'); F(!e, `${tag}: ${e}`); await p.waitForTimeout(400); k = await kb(p); D.back = k.pick; F(k.pick === 'buttons' && k.cls === 'kb fourths' && k.chip && k.chip.t === 'Buttons', `${tag}: after Simple / Kids ${k.pick} ${k.cls}`);
    await p.reload(); await p.waitForTimeout(1400); k = await kb(p); F(k.pick === 'buttons', `${tag}: after the switches + reload ${k.pick}`);
    await done(p, tag); }
  // 5. Octave: at rest on the tonic, slides to show a chord, snaps back; keys rise from the root; same sound in all views
  { const tag = 'octave window'; const p = await open(b, 360, 780, XS()); const D = R.data[tag] = {};
    let k = await kb(p); D.rest = k.pads[0].m; F(k.pads[0].m === 60 && k.win === 60, `${tag}: C major at rest starts ${k.pads[0].m} (win ${k.win})`);
    const during = await chipHold(p, 'Am', () => kb(p)); D.during = during && during.pads[0].m;
    F(during && during.pads[0].m > 60 && [69, 72, 76].every(m => during.pads.some(x => x.m === m && x.held)), `${tag}: Am did not slide the window to show A C E (${during && during.pads[0].m}, lit ${during && during.pads.filter(x => x.held).map(x => x.m)})`);
    await p.waitForTimeout(1400); k = await kb(p); D.back = k.pads[0].m; F(k.pads[0].m === 60, `${tag}: no snap back to C (${k.pads[0].m})`);
    await p.evaluate(() => __setKey(7, 'major')); await p.waitForTimeout(600); k = await kb(p); D.g = k.pads[0].m; F(k.pads[0].m === 67, `${tag}: G major at rest starts ${k.pads[0].m}`);
    await done(p, tag); }
  { const tag = 'order + sound'; const D = R.data[tag] = {}; const snd = {};
    for (const keys of ORD) { const p = await open(b, 360, 780, XS({ octave: 'octave', full: 'full', buttons: 'fourths' }[keys]));
      const k = await kb(p);
      if (keys !== 'buttons') { const byX = k.pads.slice().sort((a, c) => a.x - c.x).map(x => x.m); F(byX.every((m, i) => !i || m > byX[i - 1]) && byX[0] === 60, `${tag} ${keys}: pitch not rising left to right from C ${byX}`); }
      else { const rows = {}; k.pads.forEach(x => { const y = Math.round(x.y); (rows[y] = rows[y] || []).push(x); }); const ys = Object.keys(rows).map(Number).sort((a, c) => c - a);
        const ok = ys.every((y, ri) => { const r = rows[y].sort((a, c) => a.x - c.x).map(x => x.m); return r.every((m, i) => !i || m === r[i - 1] + 1) && r[0] === 60 + 5 * ri; });
        F(ok && ys.length === 4, `${tag} buttons: rows not rising (bottom-left C, +1 right, +5 up) ${JSON.stringify(ys.map(y => rows[y].map(x => x.m)))}`); }
      const v = await chipHold(p, 'Am', async () => ({ s: await sounding(p), lit: (await kb(p)).pads.filter(x => x.held).map(x => x.m) }));
      snd[keys] = v && v.s; D[keys] = v;
      F(v && v.s.length && v.s[0] % 12 === 9, `${tag} ${keys}: Am does not sound root lowest ${v && v.s}`);
      if (keys !== 'buttons') F(v && JSON.stringify(v.lit.slice().sort((a, c) => a - c)) === JSON.stringify(v.s) && v.lit[0] % 12 === 9, `${tag} ${keys}: lit keys ${v && v.lit} vs sounding ${v && v.s} (root lowest, leftmost)`);
      await done(p, `${tag} ${keys}`); }
    F(JSON.stringify(snd.octave) === JSON.stringify(snd.full) && JSON.stringify(snd.full) === JSON.stringify(snd.buttons), `${tag}: Am sounds differently ${JSON.stringify(snd)}`); }
  // 6. Kids / Simple keep their keys with any saved pick
  for (const m of ['simple', 'kids']) { const tag = `untouched ${m}`; const one = [];
    for (const lay of ['octave', 'fourths', 'full']) { const p = await open(b, 360, 780, { s: Object.assign({}, SET[m].s, { layout: lay }) }); const k = await kb(p); one.push(k.cls + ' ' + k.n + ' ' + (k.chip ? 'chip' : '')); await done(p, `${tag} ${lay}`); }
    R.data[tag] = one; F(one.every(x => x === one[0]) && !/chip/.test(one[0]) && /piano/.test(one[0]), `${tag}: keys follow the saved layout ${one}`); }
  // 7. equal heights
  if (!process.env.NO_EQH) { const D = R.data.eqh = { checked: 0, rows: 0, bad: [] };
    for (const [w, h] of [[360, 780], [384, 832], [412, 915]]) for (const m of ['kids', 'simple', 'expert']) for (const hour of [12, 22]) for (const [nm, act] of ST[m]) {
      const p = await open(b, w, h, m === 'expert' ? XS() : SET[m], `?test=1&hour=${hour}`); await act(p);
      const r = await p.evaluate(`(${EQH.toString()})()`); D.checked++; D.rows += r.rows;
      r.bad.forEach(x => { const s = `${w}x${h} ${m} ${hour === 12 ? 'day' : 'lamp'} ${nm}: ${x.items.join(' | ')}`; D.bad.push(s); F(false, 'equal heights ' + s); });
      await done(p, `eqh ${w}x${h} ${m} ${nm}`); }
    F(D.checked >= 100 && D.rows > 300, `equal heights: only ${D.checked} screens / ${D.rows} rows checked`); }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'rd13.json'), JSON.stringify(R, null, 1));
  console.log(R.fails.length ? 'FAIL ' + R.fails.length + '\n' + R.fails.join('\n') : 'PASS', JSON.stringify(R.data).slice(0, 5000));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
