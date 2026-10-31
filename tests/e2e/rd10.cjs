// rd10: (1) lyrics parity: every Expert step shows the line Simple shows at the same beat (v1.2 + v1.3; v1.2's repeated
// Full verse takes each pass's lines from the easy chart); (2) Simple's Look: Auto by the (mocked) clock, Day, Lamp,
// saved, pause before the switch at 19:00, never in the test-only classic hatch; (3) the Look row in Kids, Simple and
// Expert; (4) Simple Day contrast (text AA, controls 3:1) on chips, pads / note row, lyrics + song bar, controls, badges
// and the sheet, 3 sizes (Lamp is reported, not gated: it is 351c02c's look); (5) Simple Lamp is pixel-identical to
// rd9 (RD9=<url of an f0cebc4 server>; animations and the dev badge hidden in both); (6) screenshots Day vs Lamp.
// node -r ./emulate.cjs rd10.cjs [WxH]   env BASE, RD9, OUT, CMP
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const URL = process.env.URL || process.env.BASE || 'http://localhost:8080/index.html'; const RD9 = process.env.RD9 || '';
const OUT = process.env.OUT || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const CMP = process.env.CMP || ''; if (CMP) fs.mkdirSync(CMP, { recursive: true });
const SIZES = process.argv[2] ? [process.argv[2].split('x').map(Number)] : [[360, 780], [780, 360], [820, 1180]];
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
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  // 1. lyrics parity (data; one size)
  for (const [name, src] of [['v1.2', V12], ['v1.3', V13]]) { const tag = `lyrics ${name}`;
    const p = await open(b, 360, 780, SET.expert);
    F((await p.evaluate(t => __upload.load(t), src)).ok, `${tag}: load`); await p.waitForTimeout(500);
    const E = await lyr(p); let e = await switchTo(p, 'expert', 'simple'); F(!e, `${tag}: ${e}`); const S = await lyr(p);
    const bad = []; E.forEach((x, i) => { let k = -1; S.forEach((y, j) => { if (y.t <= x.t + 1e-6) k = j; }); if (!S[k] || S[k].text !== x.text) bad.push(`E${i}@${x.t}: "${(x.text || '-').slice(0, 24)}" vs "${((S[k] || {}).text || '-').slice(0, 24)}"`); });
    R.data[tag] = { expert: E.length, simple: S.length, mismatches: bad.length };
    F(E.length >= 70 && bad.length === 0, `${tag}: ${bad.length} Expert steps differ from Simple at their beat: ${bad.slice(0, 6).join(' | ')}`);
    if (name === 'v1.2') { const t17 = E[17] && E[17].text; R.data[tag].step17 = t17; F(/^Nếu như ta không gặp nhau/.test(t17 || ''), `${tag}: Expert step 17 "${t17}"`); }
    await done(p, tag);
  }
  // 2. Simple's Look by the clock (mocked), the picks, the pause, the classic hatch
  { const tag = 'look clock';
    let p = await openClock(b, 360, 780, SET.simple, '2026-10-31T10:00:00');
    let c = await cls(p); F(c.day && !c.lamp, `${tag}: Auto at 10:00 ${JSON.stringify(c)}`); await done(p, tag + ' 10');
    p = await openClock(b, 360, 780, SET.simple, '2026-10-31T21:00:00'); c = await cls(p); F(!c.day && c.lamp, `${tag}: Auto at 21:00 ${JSON.stringify(c)}`); await done(p, tag + ' 21');
    p = await openClock(b, 360, 780, SET.simple, '2026-10-31T06:59:00'); c = await cls(p); F(!c.day && c.lamp, `${tag}: Auto at 6:59 ${JSON.stringify(c)}`); await done(p, tag + ' 6');
    // the 19:00 boundary waits for a pause in playing (as rd6 checks it for Expert)
    p = await open(b, 360, 780, SET.simple, '?test=1', { at: '2026-10-31T18:59:00', ls: { [SLK]: { v: 1, look: 'auto' } } });
    c = await cls(p); F(c.day, `${tag}: 18:59 not Day`);
    const pad = (await rectOf(p, '#pads .pad:not(.out)')) || (await rectOf(p, '#suggest .ss-note'));
    await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pad.x, y: pad.y }] }); await p.waitForTimeout(150);
    await p.clock.setFixedTime(new Date('2026-10-31T19:00:30'));
    const c1 = await p.evaluate(() => __look.check()); c = await cls(p);
    F(c1 === 'wait' && c.day, `${tag}: switched while a finger was down (${c1})`);
    await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(150);
    await p.evaluate(() => __look.setPause(1500));
    const c2 = await p.evaluate(() => __look.check()); c = await cls(p);
    F(c2 === 'wait' && c.day, `${tag}: switched right after the last note (${c2})`);
    await p.waitForTimeout(3000); c = await cls(p);
    const sw = await p.evaluate(() => __look.log.switches.slice());
    F(c.lamp && !c.day && sw.includes('simple:lamp'), `${tag}: no switch to Lamp after the pause ${JSON.stringify(c)} ${sw}`);
    R.data[tag] = { c1, c2, switches: sw }; await done(p, tag + ' boundary');
    // the pick from the sheet: Day / Lamp / Auto, kept after a reload
    p = await open(b, 360, 780, SET.simple, '?test=1&hour=21');
    F(await openSheet(p, 'simple'), `${tag}: sheet`);
    const row = await p.evaluate(() => { const r = document.querySelector('#modeSheet .ms-look'); return r && !r.hidden && getComputedStyle(r).display !== 'none' ? [...r.querySelectorAll('button')].map(x => x.textContent + (x.classList.contains('on') ? '*' : '')) : null; });
    F(JSON.stringify(row) === '["Auto*","Day","Lamp"]', `${tag}: Simple Look row ${JSON.stringify(row)}`);
    await tap(p, '#msLook button[data-look="day"]'); await p.waitForTimeout(300); c = await cls(p); F(c.day, `${tag}: Day pick at 21:00 ${JSON.stringify(c)}`);
    const sd = await p.evaluate(() => document.querySelector('.ms-wrap').classList.contains('ms-day')); F(sd, `${tag}: the sheet is not in Day`);
    await p.reload(); await p.waitForTimeout(1300); c = await cls(p); F(c.day, `${tag}: Day not kept after a reload`);
    await openSheet(p, 'simple'); await tap(p, '#msLook button[data-look="lamp"]'); await p.waitForTimeout(300); c = await cls(p); F(c.lamp && !c.day, `${tag}: Lamp pick ${JSON.stringify(c)}`);
    await tap(p, '#msLook button[data-look="auto"]'); await p.waitForTimeout(300); c = await cls(p); F(c.lamp, `${tag}: Auto at 21:00 after picks ${JSON.stringify(c)}`);
    const saved = await p.evaluate(k => localStorage.getItem(k), SLK); F(/"look":"auto"/.test(saved || ''), `${tag}: saved ${saved}`);
    // Simple's look never leaks into Expert / Kids, and Expert's pick does not change Simple's
    await tap(p, '#msLook button[data-look="day"]'); await p.waitForTimeout(200); await tap(p, '#msMode button[data-mode="expert"]'); await p.waitForTimeout(700);
    c = await cls(p); F(!c.day && !c.lamp, `${tag}: Simple's look class in Expert ${JSON.stringify(c)}`);
    let e = await switchTo(p, 'expert', 'simple'); c = await cls(p); F(!e && c.day, `${tag}: back in Simple ${JSON.stringify(c)} ${e}`);
    await done(p, tag + ' picks');
    // the test-only classic hatch keeps the classic (Lamp) screen whatever the pick
    p = await open(b, 360, 780, SET.simple, '?test=1&classic=1&hour=12', LK('day')); c = await cls(p); F(!c.day && !c.lamp, `${tag}: classic hatch ${JSON.stringify(c)}`); await done(p, tag + ' classic');
  }
  // 3. the Look row in all three modes
  { const tag = 'look row';
    for (const [m, setup] of [['kids', SET.kids], ['simple', SET.simple], ['expert', SET.expert]]) {
      const p = await open(b, 360, 780, setup); const ok = await openSheet(p, m);
      const r = await p.evaluate(() => { const r = document.querySelector('#modeSheet .ms-look'); return r && !r.hidden && r.getClientRects().length ? [...r.querySelectorAll('button')].filter(x => !x.disabled).length : 0; });
      F(ok && r === 3, `${tag}: ${m} has ${r} Look buttons (sheet ${ok})`); R.data[tag + ' ' + m] = r; await done(p, tag + ' ' + m);
    }
  }
  // 4 / 5 / 6 per size
  for (const [w, h] of SIZES) { const T = `${w}x${h}`, D = R.data[T] = {};
    for (const look of ['day', 'lamp']) {
      const p = await open(b, w, h, SET.simple, null, LK(look));
      const c = await cls(p); F(look === 'day' ? c.day : c.lamp, `${T} ${look}: class ${JSON.stringify(c)}`);
      const a = await contrast(p);   // the progression (step badges)
      await p.evaluate(t => __upload.load(t), V13); await p.waitForTimeout(600);
      await p.evaluate(() => { for (let i = 0; i < 9; i++) document.querySelector('#prog .pg-step').click(); }); await p.waitForTimeout(500);
      const s1 = await contrast(p);   // a song with lyrics, step 9
      if (CMP) await p.screenshot({ path: path.join(CMP, `${T}-simple-${look}.png`) });
      await openSheet(p, 'simple'); await p.waitForTimeout(400);
      const sh = await sheetContrast(p);
      if (CMP) await p.screenshot({ path: path.join(CMP, `${T}-sheet-${look}.png`) });
      const bad = [...a.text, ...a.ctrl, ...s1.text, ...s1.ctrl, ...sh.text, ...sh.ctrl];
      D[look] = { checked: a.n.text + a.n.ctrl + s1.n.text + s1.n.ctrl + sh.n.text + sh.n.ctrl, below: bad.length, worst: bad.slice(0, 4).map(x => `${x.g} "${x.t}" ${x.r}`) };
      if (look === 'day') F(bad.length === 0, `${T} day: ${bad.length} below AA / 3:1: ${bad.slice(0, 8).map(x => JSON.stringify(x)).join(' ')}`);
      F(D[look].checked > 80, `${T} ${look}: only ${D[look].checked} checked`);
      await done(p, `${T} ${look}`);
    }
    // keyboard order in Day: the note row rises left to right from the root
    { const p = await open(b, w, h, SET.simple, null, LK('day'));
      const xs = await p.evaluate(() => [...document.querySelectorAll('#suggest .ss-note')].filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect().x));
      F(xs.length >= 7 && xs.every((x, i) => i === 0 || x > xs[i - 1]), `${T} day: note row not left to right ${xs}`); await done(p, `${T} order`); }
    // Lamp = rd9, pixel for pixel
    if (RD9) {
      const shots = [];
      for (const base of [URL, RD9]) {
        const ctx = await b.newContext({ viewport: { width: w, height: h } });
        await ctx.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:${JSON.stringify(SET.simple.s)}}));localStorage.setItem('${SLK}','{"v":1,"look":"lamp"}');}}catch(e){}`);
        const p = await ctx.newPage(); await p.goto(base + '?test=1&hour=12'); await p.waitForTimeout(1300); await p.addStyleTag({ content: FREEZE }); await p.waitForTimeout(300);
        const one = [await p.screenshot()];
        await p.evaluate(t => __upload.load(t), V13); await p.waitForTimeout(600); await p.evaluate(() => { for (let i = 0; i < 9; i++) document.querySelector('#prog .pg-step').click(); }); await p.waitForTimeout(600);
        one.push(await p.screenshot()); shots.push(one); await ctx.close();
      }
      const same = shots[0].map((s, i) => s.equals(shots[1][i]));
      D.lampVsRd9 = same; F(same.every(Boolean), `${T}: Simple Lamp differs from rd9 (${same})`);
      if (!same.every(Boolean)) shots.forEach((one, k) => one.forEach((s, i) => fs.writeFileSync(path.join(OUT, `rd10-${T}-lamp-${k ? 'rd9' : 'rd10'}-${i}.png`), s)));
    } else F(false, `${T}: RD9 not set (Lamp vs rd9 not checked)`);
    console.log(T, R.fails.length);
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, `rd10${process.argv[2] ? '-' + process.argv[2] : ''}.json`), JSON.stringify(R, null, 1));
  console.log(R.fails.length ? 'FAIL ' + R.fails.length + '\n' + R.fails.join('\n') : 'PASS', JSON.stringify(R.data).slice(0, 4000));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
