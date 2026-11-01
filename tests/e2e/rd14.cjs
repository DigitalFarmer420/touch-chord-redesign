// rd14: the Expert keyboard panel's header strip. In Octave, Full and Buttons at 360x780, 384x832, 412x915, 780x360 and
// 1180x820 (Day and Lamp): every key's area, hit-tested on a 5x5 grid 5px in from its edges (elementFromPoint), lands on that key (a white
// key's points under a black key land on the black key), never on the Keys chip, the enable-sound pill or anything
// else; the chip sits in the strip above the keys and clear of the pill; the panel and the chord grid keep rd13's boxes
// (RD13=<b640237 server>). Also: the Song | Progressions track is 44px outside, 38px segments, = Next / Play.
// node -r ./emulate.cjs rd14.cjs   env BASE, RD13, OUT, CMP (before / after shots)
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const URL = process.env.URL || process.env.BASE || 'http://localhost:8080/index.html'; const RD13 = process.env.RD13 || '';
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
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h] of (process.env.SZ ? process.env.SZ.split(',').map(x => x.split('x').map(Number)) : [[360, 780], [384, 832], [412, 915], [780, 360], [1180, 820]])) { const T = `${w}x${h}`, D = R.data[T] = {};
    for (const k of ['octave', 'full', 'buttons']) for (const hour of [12, 22]) { const tag = `${T} ${k} ${hour === 12 ? 'day' : 'lamp'}`;
      const p = await open(b, w, h, XS(k), `?test=1&hour=${hour}`); const g = await hit(p);
      D[k + (hour === 12 ? '' : ' lamp')] = { keys: g.n, points: g.pts, bad: g.bad.length, strip: Math.round(g.keysTop - g.wrap.t) };
      F(g.n >= 12 && g.pts === g.n * 25, `${tag}: ${g.n} keys / ${g.pts} points`);
      F(!g.bad.length, `${tag}: ${g.bad.length} key points not on their key: ${g.bad.slice(0, 6).join('; ')}`);
      const land = w > h && h < 500;   // rd15: short landscape has no header strip (the chip is in the right-hand column; rd15.cjs checks it)
      if (!land) F(g.chip && g.chip.b <= g.keysTop + 0.5 && g.chip.t >= g.wrap.t - 0.5 && g.chip.r <= g.wrap.r + 0.5, `${tag}: chip not in the strip above the keys ${JSON.stringify([g.chip, g.keysTop, g.wrap])}`);
      if (!land) F(g.pill && !ov(g.pill, g.chip) && g.pill.b <= g.keysTop + 0.5, `${tag}: enable-sound pill ${JSON.stringify(g.pill)} vs chip ${JSON.stringify(g.chip)} keys top ${g.keysTop}`);
      // after the pill is gone (sound on) the keys still never sit under the chip
      if (hour === 12 && RD13) { const q = await open(b, w, h, XS(k), '?test=1&hour=12'); await q.goto(RD13 + '?test=1&hour=12'); await q.waitForTimeout(1300); const g0 = await hit(q);
        F(JSON.stringify(g0.wrap) === JSON.stringify(g.wrap) && JSON.stringify(g0.grid) === JSON.stringify(g.grid), `${tag}: panel / grid moved vs rd13 ${JSON.stringify([g.wrap, g.grid])} vs ${JSON.stringify([g0.wrap, g0.grid])}`);
        D[k].rd13bad = g0.bad.length;
        if (CMP && (T === '360x780' || T === '780x360')) { await q.screenshot({ path: path.join(CMP, `${T}-${k}-before-rd13.png`) }); await p.screenshot({ path: path.join(CMP, `${T}-${k}-after-rd14.png`) }); }
        await q.context().close(); }
      await done(p, tag); }
    console.log(T, R.fails.length);
  }
  if (!RD13) F(false, 'RD13 not set (panel vs rd13 not checked)');
  // the Song | Progressions track = Next / Play (44 outside, 38 segments), upright phones, Day and Lamp
  for (const [w, h] of [[360, 780], [384, 832], [412, 915]]) for (const hour of [12, 22]) { const tag = `track ${w}x${h} ${hour === 12 ? 'day' : 'lamp'}`;
    const p = await open(b, w, h, XS('octave'), `?test=1&hour=${hour}`);
    const t = await p.evaluate(() => { const r = s => { const e = document.querySelector(s), q = e.getBoundingClientRect(), cs = getComputedStyle(e), o = cs.outlineStyle !== 'none' ? parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset) : 0; return { t: q.top - Math.max(0, o), h: q.height + 2 * Math.max(0, o) }; };
      return { tog: r('#xTog'), seg: [...document.querySelectorAll('#xTog button')].map(b => b.getBoundingClientRect().height), next: r('#xNext'), play: r('#xPlay') }; });
    R.data[tag] = t;
    F(t.tog.h === 44 && t.next.h === 44 && t.play.h === 44 && t.tog.t === t.next.t && t.next.t === t.play.t, `${tag}: track ${JSON.stringify(t)}`);
    F(t.seg.length === 2 && t.seg.every(x => x === 38), `${tag}: segments ${t.seg}`);
    await done(p, tag); }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'rd14.json'), JSON.stringify(R, null, 1));
  console.log(R.fails.length ? 'FAIL ' + R.fails.length + '\n' + R.fails.join('\n') : 'PASS', JSON.stringify(R.data).slice(0, 4000));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
