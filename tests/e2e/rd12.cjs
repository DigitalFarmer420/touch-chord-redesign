// rd12 (Uiux Low): tablet lyric lines about 16px (Simple's song bar rows / line; Expert's lyric line), Day and Lamp;
// the song title (and its truncation) as in rd11; phones (360x780, 780x360, 412x915) pixel-identical to rd11 (RD11=<aaff6c8 server>).
// node -r ./emulate.cjs rd12.cjs   env BASE, RD11, OUT, CMP (before/after shots)
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const URL = process.env.URL || process.env.BASE || 'http://localhost:8080/index.html'; const RD11 = process.env.RD11 || '';
const OUT = process.env.OUT || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const CMP = process.env.CMP || ''; if (CMP) fs.mkdirSync(CMP, { recursive: true });
const R = { fails: [], data: {} }; const F = (c, m) => { if (!c) R.fails.push(m); };
const V13 = fs.readFileSync(path.join(__dirname, '../fixtures/upload/anh-v13.json'), 'utf8');
const V12 = fs.readFileSync(path.join(__dirname, '../fixtures/upload/anh-v12.json'), 'utf8');
const SLK = 'touchChord.simpleLook.v1', LK = look => ({ ls: { [SLK]: { v: 1, look } } });
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}#dev-badge{visibility:hidden!important}#xKeysChip{visibility:hidden!important}';
// rd13 changed on purpose: the phone top rows (Simple's mode chip 40 -> 44px, Expert's top bar / Next / Play / picker
// heights) and Expert's Keys chip; the pixel checks against older builds hide the chip and mask those rows.
const RD13M = p => ({ mask: [p.locator('header.topbar'), p.locator('#xTop'), p.locator('#xGo'), p.locator('#xSrc'), p.locator('html.expert .kb-wrap'), p.locator('html.expert.lay-phone-land #sustainBtn'), p.locator('html.expert.lay-phone-land #xCtl'), p.locator('html.expert.lay-phone-land .now-col')] })   // rd15: + short landscape's right-hand column and Now card   // rd14: + Expert's keyboard panel (header strip);
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
const PADS = [[1180, 820], [820, 1180], [768, 1024], [1024, 768], [1366, 1024], [1024, 1366], [744, 1133], [1133, 744]];
const PHONES = [[360, 780], [780, 360], [412, 915]];
const song = async p => { await p.evaluate(t => __upload.load(t), V13); await p.waitForTimeout(600); await p.evaluate(() => { const s = document.querySelector('#prog .pg-step'); if (s) for (let i = 0; i < 9; i++) s.click(); }); await p.waitForTimeout(600); };
const lyrSizes = p => p.evaluate(() => { const v = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  return [...document.querySelectorAll('#songBar .sb-row, #songBar .sb-line, .x-sline')].filter(v).filter(e => e.textContent.trim()).map(e => { const cs = getComputedStyle(e);
    return { sel: e.className, px: parseFloat(cs.fontSize), clip: e.scrollHeight > e.clientHeight + 1 && e.clientHeight > 0, t: e.textContent.trim().slice(0, 16) }; }); });
const title = p => p.evaluate(() => { const v = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  return [...document.querySelectorAll('body *')].filter(e => v(e) && !e.closest('#songBar') && !e.children.length && /Anh Đã Ổn Hơn/.test(e.textContent)).map(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return { c: e.className, w: Math.round(r.width), fs: cs.fontSize, to: cs.textOverflow, ws: cs.whiteSpace, ov: cs.overflow, sw: e.scrollWidth > e.clientWidth }; }); });
async function lampOpen(b, base, w, h, setup, look) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const x = setup.x ? `localStorage.setItem('touchChord.expert.v1',${JSON.stringify(JSON.stringify(setup.x))});` : '';
  await ctx.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:${JSON.stringify(setup.s)}}));localStorage.setItem('${SLK}','{"v":1,"look":"${look}"}');${x}}}catch(e){}`);
  const p = await ctx.newPage(); await p.goto(base + `?test=1&hour=${look === 'lamp' ? 22 : 12}`); await p.waitForTimeout(1300); await p.addStyleTag({ content: FREEZE }); await p.waitForTimeout(300); return p;
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  // 1. tablet lyric size, Simple and Expert, Day and Lamp; title as in rd11
  for (const [w, h] of PADS) { const T = `${w}x${h}`, D = R.data[T] = {};
    for (const m of ['simple', 'expert']) for (const look of ['day', 'lamp']) { const k = `${m} ${look}`;
      const p = await open(b, w, h, SET[m], `?test=1&hour=${look === 'lamp' ? 22 : 12}`, LK(look)); await song(p);
      const c = await p.evaluate(() => document.documentElement.className); F(look === 'day' ? new RegExp(m === 'simple' ? 's-day' : 'x-day').test(c) : new RegExp(m === 'simple' ? 's-lamp' : 'x-lamp').test(c), `${T} ${k}: class ${c}`);
      const L = await lyrSizes(p), t = await title(p); D[k] = { px: [...new Set(L.map(x => x.px))], n: L.length, clip: L.filter(x => x.clip).length };
      F(L.length >= 1, `${T} ${k}: no lyric line`); F(L.every(x => x.px >= 15.5), `${T} ${k}: lyric under 16px ${JSON.stringify(L)}`); F(!L.some(x => x.clip), `${T} ${k}: lyric clipped ${JSON.stringify(L)}`);
      if (RD11 && look === 'day') { const q = await open(b, w, h, SET[m], '?test=1&hour=12', LK(look)); await q.goto(RD11 + '?test=1&hour=12'); await q.waitForTimeout(1300); await song(q);
        const t0 = await title(q); F(JSON.stringify(t) === JSON.stringify(t0), `${T} ${k}: song title changed ${JSON.stringify(t)} vs rd11 ${JSON.stringify(t0)}`); D[k].title = t.length;
        const L0 = await lyrSizes(q); D[k].rd11px = [...new Set(L0.map(x => x.px))]; await q.context().close(); }
      if (CMP && m === 'simple' && look === 'day' && (T === '1180x820' || T === '820x1180')) await p.screenshot({ path: path.join(CMP, `${T}-simple-day-after.png`) });
      if (CMP && m === 'expert' && look === 'day' && T === '1180x820') await p.screenshot({ path: path.join(CMP, `${T}-expert-day-after.png`) });
      await done(p, `${T} ${k}`);
    }
    console.log(T, R.fails.length);
  }
  // 2. phones pixel-identical to rd11 (Simple Day / Lamp, Expert), start and a song with lyrics
  if (RD11) for (const [w, h] of PHONES) { const T = `${w}x${h}`, D = R.data[T] = {};
    for (const [m, look] of [['simple', 'day'], ['simple', 'lamp'], ['expert', 'day'], ['expert', 'lamp']]) { const shots = [];
      for (const base of [URL, RD11]) { const p = await lampOpen(b, base, w, h, SET[m], look); const one = [await p.screenshot(RD13M(p))]; await song(p); one.push(await p.screenshot(RD13M(p))); shots.push(one); await p.context().close(); }
      const same = shots[0].map((s, i) => s.equals(shots[1][i])); D[`${m} ${look}`] = same; F(same.every(Boolean), `${T} ${m} ${look}: differs from rd11 (${same})`);
      if (!same.every(Boolean)) shots.forEach((one, k) => one.forEach((s, i) => fs.writeFileSync(path.join(OUT, `rd12-${T}-${m}-${look}-${k ? 'rd11' : 'rd12'}-${i}.png`), s)));
      if (CMP && T === '360x780' && m === 'simple' && look === 'day') fs.writeFileSync(path.join(CMP, `360x780-simple-day-after.png`), shots[0][1]);
    }
    console.log(T, R.fails.length);
  } else F(false, 'RD11 not set (phones vs rd11 not checked)');
  // before shots (rd11)
  if (CMP && RD11) { fs.mkdirSync(path.join(CMP, 'before'), { recursive: true });
    for (const [w, h, m] of [[1180, 820, 'simple'], [820, 1180, 'simple'], [1180, 820, 'expert'], [360, 780, 'simple']]) {
      const p = await lampOpen(b, RD11, w, h, SET[m], 'day'); await song(p); await p.screenshot({ path: path.join(CMP, 'before', `${w}x${h}-${m}-day-before.png`) }); await p.context().close(); } }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'rd12.json'), JSON.stringify(R, null, 1));
  console.log(R.fails.length ? 'FAIL ' + R.fails.length + '\n' + R.fails.join('\n') : 'PASS', JSON.stringify(R.data).slice(0, 6000));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
