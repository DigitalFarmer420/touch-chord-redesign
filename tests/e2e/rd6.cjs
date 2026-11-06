// rd6: one mode chip + one Settings sheet in Kids / Simple / Expert, Look Auto · Day · Lamp, and the rd6 fixes.
// At each size (default the six rd6 sizes; phone emulation via -r emulate.cjs):
//   A. every mode shows exactly one mode chip (top right, labelled with the mode) and none of the old controls (Kids
//      gear, Simple toggle, gear menu, gold Expert button); the chip opens the same sheet in every mode with the rows in
//      one order (Mode, Play along, Show hints, Chord numbers, Look, [Upload a song: Expert only], How to & tour, Start
//      over); in Kids a short tap (and a 0.4 s press) does not open it, a 1 s hold does; Simple: Look is shown with its
//      note and disabled, no Kids style chip; screenshots of the chip and the sheet per mode (SHOTS / CMP dirs).
//   B. the Expert Style menu opens with the selected style fully in view (Yoga, Country).
//   C. Look: Auto picks Day at 12:00 and Lamp at 22:00 from the device clock (Playwright's mocked clock, no hour
//      override); kept Day / Lamp picks win over the clock; at the 19:00 boundary the look waits while a finger is down
//      and switches by itself only after a pause, once, with a fade.
//   D. the Kids step survives a reload: Kids step 3 -> Expert -> reload -> Kids resumes at step 3.
//   E. upload chart: a two-chart song plays the Full chart in Expert and the easy chart in Simple; a one-chart song
//      plays it in both.
//   F. the one-time note: an old saved Full setup opens in Expert with "Simple's dense layout lives in Expert now" once
//      per device (dismissible, saved as seen, gone after a reload); not for a fresh setup, a saved Expert setup or ?expert=1.
//   G. saved Simple + Kids style loads as Pop. No page errors anywhere.
// node -r ./emulate.cjs rd6.cjs [WxH]   env BASE, OUT, SHOTS, CMP (dir for the chip / sheet screenshots)
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const URL = process.env.URL || process.env.BASE || 'http://localhost:8080/index.html';
const OUT = process.env.OUT || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const SHOTS = process.env.SHOTS || '/tmp/tc-shots'; fs.mkdirSync(SHOTS, { recursive: true });
const CMP = process.env.CMP || ''; if (CMP) fs.mkdirSync(CMP, { recursive: true });
const SIZES = process.argv[2] ? [process.argv[2].split('x').map(Number)] : [[360, 780], [780, 360], [390, 844], [844, 390], [820, 1180], [1180, 820]];
const R = { fails: [], data: {} }; const F = (c, m) => { if (!c) R.fails.push(m); };
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/upload/expert-song.json'), 'utf8'));
const TWO = JSON.parse(JSON.stringify(FX)); TWO.song.title = 'Amazing Grace Two';
TWO.sectionsFull = JSON.parse(JSON.stringify(FX.sections)).map(s => { s.chords = s.chords.map(c => Object.assign(c, { chord: c.chord === 'C' ? 'Cmaj7' : c.chord })); return s; });
const ONE = JSON.parse(JSON.stringify(FX)); ONE.song.title = 'Amazing Grace One';
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
const sheetRows = p => p.evaluate(() => { const v = e => e.getClientRects().length && !e.hidden;
  const rows = [...document.querySelectorAll('#modeSheet [data-row]')].filter(v);
  return { rows: rows.map(e => e.dataset.row), text: rows.map(e => (e.querySelector('.ms-t') || e).childNodes[0].textContent.trim()),
    modes: [...document.querySelectorAll('#msMode button')].map(b => b.dataset.mode + (b.classList.contains('on') ? '*' : '') + ':' + b.querySelector('b').textContent + '/' + b.querySelector('small').textContent),
    looks: [...document.querySelectorAll('#msLook button')].map(b => b.textContent + (b.disabled ? '(off)' : '') + (b.classList.contains('on') ? '*' : '')),
    lsub: document.querySelector('#modeSheet .ms-lsub').textContent, all: document.querySelector('#modeSheet .ms-sheet').innerText, inView: (() => { const s = document.querySelector('#modeSheet .ms-sheet').getBoundingClientRect(); return s.top >= -1 && s.bottom <= innerHeight + 1; })() }; });
const ORDER = { kids: ['mode', 'playAlong', 'hints', 'nums', 'look', 'help', 'reset'],   // rd17: Kids keeps How to & tour
  simple: ['mode', 'playAlong', 'hints', 'nums', 'look', 'reset'],   // rd17: Simple's ? menu is How to / Tour (no duplicate row, no Upload)
  expert: ['mode', 'playAlong', 'hints', 'nums', 'look', 'reset'] };   // rd17: no Keys row (the keyboard cycles it), no Upload row (Song is its home), no Help row
const TEXT = { mode: 'Mode', keys: 'Keys', playAlong: 'Play along', hints: 'Show hints', nums: 'Chord numbers', look: 'Look', upload: 'Upload a song', help: 'How to & tour', reset: 'Start over' };
const LABEL = { kids: 'Kids', simple: 'Simple', expert: 'Expert' };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h] of SIZES) { const T = `${w}x${h}`, D = R.data[T] = {};
    // A. chip + sheet per mode
    for (const mode of ['kids', 'simple', 'expert']) { const tag = `${T} ${mode}`;
      const p = await open(b, w, h, SET[mode]);
      if (mode === 'kids') { await tap(p, '#kv .kv-go'); await p.waitForTimeout(300); const c = await p.evaluate(() => { const e = document.querySelector('#kv .kv-card'); if (e) e.click(); return !!e; }); await p.waitForTimeout(400); F(c, `${tag}: no song card`); }
      let s = await probe(p); D[mode] = { chips: s.chips };
      F(s.mode === mode, `${tag}: mode ${s.mode}`);
      F(s.chips.length === 1, `${tag}: ${s.chips.length} mode chips visible ${JSON.stringify(s.chips)}`);
      if (s.chips[0]) { const c = s.chips[0]; F(c.m === mode && c.t.includes(LABEL[mode]), `${tag}: chip ${c.m} "${c.t}"`);
        F(c.x + c.w >= w * 0.6 && c.y + c.h <= Math.max(120, h * 0.2) && c.x + c.w <= w + 0.5 && c.y >= -0.5, `${tag}: chip not at the top right (${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.w)}x${Math.round(c.h)})`);
        F(c.w >= 44 && c.h >= 32, `${tag}: chip too small ${c.w}x${c.h}`); }
      F(s.old.length === 0, `${tag}: old controls visible ${s.old}`);
      if (mode === 'simple') F(s.kidsStyle === 0, `${tag}: Simple shows a Kids style chip`);
      const chipR = await rectOf(p, chipSel);
      await p.screenshot({ path: path.join(SHOTS, `rd6-${T}-${mode}-chip.png`) }); if (CMP) await p.screenshot({ path: path.join(CMP, `${T}-${mode}-chip.png`) });
      if (mode === 'kids') {   // a short tap and a 0.4 s press do not open it; the tip says to hold; a 1 s hold does
        await touch(p, chipR.x, chipR.y, 80); await p.waitForTimeout(150);
        let k = await p.evaluate(() => ({ open: !document.getElementById('modeSheet').hidden, tip: !!document.getElementById('mcTip') && !document.getElementById('mcTip').hidden && document.getElementById('mcTip').textContent, short: __ms.log.shortTaps, screen: document.getElementById('kv').dataset.screen }));
        F(!k.open, `${tag}: a short tap opened the sheet`); F(k.tip && /hold/i.test(k.tip), `${tag}: no hold tip after a short tap (${k.tip})`); F(k.screen === 'play', `${tag}: a short tap left the play screen (${k.screen})`);
        await touch(p, chipR.x, chipR.y, 450); await p.waitForTimeout(700);
        k = await p.evaluate(() => ({ open: !document.getElementById('modeSheet').hidden })); F(!k.open, `${tag}: a 0.45 s press opened the sheet`);
        // the hold shows progress: the fill grows while held
        await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: chipR.x, y: chipR.y }] }); await p.waitForTimeout(500);
        const prog = await p.evaluate(() => { const c = document.querySelector('#kv .mode-chip'); const f = c && [...document.querySelectorAll('#kv .mode-chip')].find(x => x.getClientRects().length); const fl = f.querySelector('.mc-fill'); return { holding: f.classList.contains('holding'), fw: fl.getBoundingClientRect().width, cw: f.getBoundingClientRect().width, open: !document.getElementById('modeSheet').hidden }; });
        F(prog.holding && prog.fw > 4 && prog.fw < prog.cw - 2 && !prog.open, `${tag}: no hold progress half way (${JSON.stringify(prog)})`); D.holdMid = prog;
        await p.waitForTimeout(700); await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(300);
        k = await p.evaluate(() => ({ open: !document.getElementById('modeSheet').hidden, holds: __ms.log.holds })); F(k.open && k.holds === 1, `${tag}: a 1.2 s hold did not open the sheet (${JSON.stringify(k)})`);
      } else { F(await openSheet(p, mode), `${tag}: a tap did not open the sheet`); }
      const r = await sheetRows(p); D[mode].rows = r.rows;
      F(JSON.stringify(r.rows) === JSON.stringify(ORDER[mode]), `${tag}: sheet rows ${r.rows} (want ${ORDER[mode]})`);
      r.rows.forEach((row, i) => F(r.text[i] === TEXT[row], `${tag}: row ${row} says "${r.text[i]}"`));
      F(r.modes.length === 3 && r.modes.filter(x => x.includes('*')).length === 1 && r.modes.find(x => x.includes('*')).startsWith(mode + '*'), `${tag}: mode segments ${r.modes}`);
      F(r.modes.every(x => /:(Kids|Simple|Expert)\/\S/.test(x)), `${tag}: a mode segment has no hint ${r.modes}`);
      F(JSON.stringify(r.looks.map(x => x.replace(/\W.*$/, '').replace(/[*(].*/, ''))) === '["Auto","Day","Lamp"]', `${tag}: Look ${r.looks}`);
      if (mode === 'simple') F(!/Lamp look is coming|No more Simple/.test(r.all), `${tag}: Simple sheet still has roadmap / footer copy`);   // rd7
      F(r.looks.filter(x => x.endsWith('*')).length === 1 && r.looks.find(x => x.endsWith('*')).startsWith('Auto'), `${tag}: new setup Look not Auto (${r.looks})`);
      await p.screenshot({ path: path.join(SHOTS, `rd6-${T}-${mode}-sheet.png`) }); if (CMP) await p.screenshot({ path: path.join(CMP, `${T}-${mode}-sheet.png`) });
      await p.evaluate(() => { const s = document.querySelector('#modeSheet .ms-sheet'); s.scrollTop = s.scrollHeight; }); await p.waitForTimeout(150);
      if (CMP && h > w * 1.2) await p.screenshot({ path: path.join(CMP, `${T}-${mode}-sheet-end.png`) });
      await tap(p, '#modeSheet .ms-x'); await p.waitForTimeout(200);
      F(await p.evaluate(() => document.getElementById('modeSheet').hidden), `${tag}: ✕ did not close the sheet`);
      await done(p, tag);
    }
    // B. Expert Style menu opens on the selected style
    for (const style of ['yogaDeep', 'country']) { const tag = `${T} style ${style}`;
      const p = await open(b, w, h, { s: Object.assign({}, SET.expert.s, { style }), x: { on: true } });
      await tap(p, '#xStyle'); await p.waitForTimeout(350);
      const m = await p.evaluate(st => { const m = document.getElementById('xStyleMenu'); if (!m || m.hidden) return null; const mr = m.getBoundingClientRect(), b = m.querySelector(`.x-mi[data-style="${st}"]`), br = b.getBoundingClientRect();
        const fade = m.scrollHeight > m.clientHeight && m.classList.contains('x-more') ? br.height / 2 : 0;
        return { top: br.top - mr.top, bot: mr.bottom - br.bottom, fade, scroll: m.scrollTop, over: m.scrollHeight > m.clientHeight, inWin: br.top >= 0 && br.bottom <= innerHeight }; }, style);
      D['style-' + style] = m;
      F(m && m.top >= -0.5 && m.bot >= m.fade - 0.5 && m.inWin, `${tag}: selected style not fully in view ${JSON.stringify(m)}`);
      await done(p, tag);
    }
    // C. Look from the mocked device clock (no hour override), kept picks, and the pause at the boundary
    const looks = [];
    for (const [who, at, setup, want] of [
      ['kids-auto', '2026-10-31T12:00:00', SET.kids, 'day'], ['kids-auto', '2026-10-31T22:00:00', SET.kids, 'lamp'], ['kids-auto', '2026-10-31T06:59:00', SET.kids, 'lamp'], ['kids-auto', '2026-10-31T07:00:00', SET.kids, 'day'],
      ['kids-day', '2026-10-31T22:00:00', { s: Object.assign({ theme: 'day' }, SET.kids.s) }, 'day'], ['kids-lamp', '2026-10-31T12:00:00', { s: Object.assign({ theme: 'lamp' }, SET.kids.s) }, 'lamp'],
      ['expert-auto', '2026-10-31T12:00:00', SET.expert, 'day'], ['expert-auto', '2026-10-31T19:00:00', SET.expert, 'lamp'],
      ['expert-day', '2026-10-31T23:00:00', { s: SET.expert.s, x: { on: true, look: 'day' } }, 'day'], ['expert-lamp', '2026-10-31T12:00:00', { s: SET.expert.s, x: { on: true, look: 'lamp' } }, 'lamp']]) {
      if (!(w === 360 || w === 1180) && !(who.endsWith('auto') && (at.endsWith('T12:00:00') || at.endsWith('T22:00:00')))) continue;
      const tag = `${T} look ${who} @${at.slice(11, 16)}`;
      const p = await open(b, w, h, setup, '?test=1', { at });
      const s = await probe(p); const got = who.startsWith('kids') ? (s.kvLamp ? 'lamp' : 'day') : (s.xLamp ? 'lamp' : s.xDay ? 'day' : '?');
      looks.push(`${who}@${at.slice(11, 16)}=${got}`); F(got === want, `${tag}: look ${got} (want ${want})`);
      if (who.startsWith('kids') && who !== 'kids-auto') { await tap(p, '#kv .kv-go'); await p.waitForTimeout(300); await openSheet(p, 'kids'); const r = await sheetRows(p); F(r.looks.some(x => x.toLowerCase().startsWith(who.slice(5)) && x.endsWith('*')), `${tag}: kept pick not lit ${r.looks}`); }
      await done(p, tag);
    }
    D.looks = looks;
    if (w === 360 || w === 1180) { const tag = `${T} look boundary`;
      const p = await open(b, w, h, SET.expert, '?test=1', { at: '2026-10-31T18:59:00' });
      let s = await probe(p); F(s.xDay && !s.xLamp, `${tag}: 18:59 not Day`);
      const pad = await rectOf(p, '#pads .pad:not(.out)');
      await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pad.x, y: pad.y }] }); await p.waitForTimeout(150);
      await p.clock.setFixedTime(new Date('2026-10-31T19:00:30'));
      const c1 = await p.evaluate(() => __look.check()); s = await probe(p);
      F(c1 === 'wait' && s.xDay, `${tag}: switched while a finger was down (${c1})`);
      await p.waitForTimeout(1500); s = await probe(p); F(s.xDay, `${tag}: switched while still playing`);
      await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(150);
      await p.evaluate(() => __look.setPause(1500));
      const c2 = await p.evaluate(() => __look.check()); s = await probe(p);
      F(c2 === 'wait' && s.xDay, `${tag}: switched right after the last note (${c2})`);
      const t0 = Date.now(); let saw = { fade: false };
      await p.evaluate(() => { window.__lk = { fade: 0, flips: 0 }; new MutationObserver(() => { const c = document.documentElement.classList; if (c.contains('look-vt') || c.contains('look-fade')) __lk.fade++; }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); });
      await p.waitForTimeout(3000); s = await probe(p);
      const lg = await p.evaluate(() => ({ sw: __look.log.switches.slice(), waits: __look.log.waits, fade: __lk.fade }));
      F(s.xLamp && !s.xDay, `${tag}: no switch to Lamp after the pause (${JSON.stringify(lg)})`);
      F(lg.sw.filter(x => x.startsWith('expert:')).length === 1 && lg.sw.includes('expert:lamp'), `${tag}: switches ${lg.sw}`);
      F(lg.fade > 0, `${tag}: switched without a fade`);
      D.boundary = lg; await done(p, tag);
    }
    // D. the Kids step survives a reload
    { const tag = `${T} step reload`;
      const p = await open(b, w, h, SET.kids);
      await tap(p, '#kv .kv-go'); await p.waitForTimeout(300);
      await p.evaluate(() => [...document.querySelectorAll('#kv .kv-card')].find(c => c.dataset.song === 'Kids Old MacDonald').click()); await p.waitForTimeout(300);
      for (let i = 0; i < 3; i++) { await tap(p, '#kv .kv-ctl .kv-next'); await p.waitForTimeout(200); }
      let s = await probe(p); F(s.song === 'Kids Old MacDonald' && s.pos === 3, `${tag}: setup ${s.song} @${s.pos}`);
      let e = await switchTo(p, 'kids', 'expert'); F(!e, `${tag}: ${e}`); s = await probe(p); F(s.mode === 'expert', `${tag}: not Expert (${s.mode})`);
      await p.reload(); await p.waitForTimeout(1400); s = await probe(p); F(s.mode === 'expert', `${tag}: reload not Expert (${s.mode})`);
      e = await switchTo(p, 'expert', 'kids'); F(!e, `${tag}: ${e}`); s = await probe(p);
      F(s.kv && s.screen === 'play' && s.song === 'Kids Old MacDonald' && s.pos === 3, `${tag}: back in Kids at ${s.screen} ${s.song} @${s.pos} (want play Old MacDonald @3)`);
      D.stepReload = { screen: s.screen, song: s.song, pos: s.pos }; await done(p, tag);
    }
    // E. upload chart by mode
    if (w === 360 || w === 1180 || w === 844) { const tag = `${T} upload chart`;
      const p = await open(b, w, h, SET.expert);
      const ld = await p.evaluate(t => __upload.load(t), JSON.stringify(TWO)); F(ld.ok, `${tag}: two-chart load ${JSON.stringify(ld.errors)}`);
      await p.waitForTimeout(500); await p.evaluate(() => { const c = document.querySelector('#modeSheet .ms-x'); document.querySelectorAll('.up-dlg, dialog[open]').forEach(d => { try { d.close && d.close(); } catch (e) {} }); });
      let c = await p.evaluate(() => __xmode.chart()); F(c && c.two && c.ver === 'full', `${tag}: Expert plays ${JSON.stringify(c)} (want full)`);
      const fullEv = c && c.events;
      let e = await switchTo(p, 'expert', 'simple'); F(!e, `${tag}: ${e}`);
      c = await p.evaluate(() => __xmode.chart()); F(c && c.ver === 'simple', `${tag}: Simple plays ${JSON.stringify(c)} (want simple)`);
      e = await switchTo(p, 'simple', 'expert'); F(!e, `${tag}: ${e}`);
      c = await p.evaluate(() => __xmode.chart()); F(c && c.ver === 'full', `${tag}: back in Expert plays ${JSON.stringify(c)}`);
      await p.reload(); await p.waitForTimeout(1400); c = await p.evaluate(() => __xmode.chart()); F(c && c.ver === 'full', `${tag}: Expert after a reload plays ${JSON.stringify(c)}`);
      const l1 = await p.evaluate(t => __upload.load(t), JSON.stringify(ONE)); F(l1.ok, `${tag}: one-chart load`); await p.waitForTimeout(500);
      c = await p.evaluate(() => __xmode.chart()); F(c && !c.two && c.ver === 'simple' && c.events > 0, `${tag}: one-chart song in Expert ${JSON.stringify(c)}`);
      e = await switchTo(p, 'expert', 'simple'); c = await p.evaluate(() => __xmode.chart()); F(c && !c.two && c.ver === 'simple' && c.events > 0, `${tag}: one-chart song in Simple ${JSON.stringify(c)}`);
      D.chart = { log: await p.evaluate(() => __xmode.log.chart.slice()) }; await done(p, tag);
    }
    // F. the one-time dense-layout note
    { const tag = `${T} dense note`;
      const p = await open(b, w, h, SET.full);
      let s = await probe(p); D.dense = { first: s.note, mode: s.mode };
      F(s.mode === 'expert', `${tag}: old Full setup opened in ${s.mode}`);
      F(s.note === 'Dense layout is here now', `${tag}: note "${s.note}"`);
      F(await p.evaluate(() => JSON.parse(localStorage.getItem('touchChord.notes.v1') || '{}').denseMoved === true), `${tag}: not saved as seen`);
      const nr = await rectOf(p, '#xDenseNote'); F(nr && nr.t >= -0.5 && nr.b <= h + 0.5 && nr.l >= -0.5 && nr.r <= w + 0.5, `${tag}: note off screen ${JSON.stringify(nr)}`);
      if (w === 360 || w === 820) { await p.screenshot({ path: path.join(SHOTS, `rd6-${T}-dense-note.png`) }); if (CMP) await p.screenshot({ path: path.join(CMP, `${T}-expert-dense-note.png`) }); }
      await tap(p, '#xDenseNote'); await p.waitForTimeout(600); s = await probe(p); F(s.note == null, `${tag}: a tap did not dismiss the note`);   // rd9: no ✕, the first tap fades it
      await p.reload(); await p.waitForTimeout(1400); s = await probe(p); F(s.note == null && s.mode === 'expert', `${tag}: note shown again after a reload (${s.note}, ${s.mode})`);
      await done(p, tag);
      const p2 = await open(b, w, h, null, '?test=1&hour=12'); s = await probe(p2); F(s.note == null, `${tag}: note on a fresh setup`);
      const e = await switchTo(p2, s.kv ? 'kids' : s.mode, 'expert'); s = await probe(p2); F(!e && s.mode === 'expert' && s.note == null, `${tag}: note on a fresh setup switched to Expert (${e}, ${s.note})`); await done(p2, tag + ' fresh');
      const p3 = await open(b, w, h, SET.expert); s = await probe(p3); F(s.note == null, `${tag}: note on a saved Expert setup`); await done(p3, tag + ' expert');
      const p4 = await open(b, w, h, SET.full, '?test=1&hour=12&expert=1'); s = await probe(p4); F(s.note == null, `${tag}: note with ?expert=1`); await done(p4, tag + ' url');
      const p5 = await open(b, w, h, SET.full, null, { ls: { 'touchChord.notes.v1': { denseMoved: true } } }); s = await probe(p5); F(s.note == null && s.mode === 'expert', `${tag}: note on a device that saw it`); await done(p5, tag + ' seen');
    }
    // G. saved Simple + Kids style loads as Pop
    { const tag = `${T} simple kids style`;
      const p = await open(b, w, h, { s: { expert: true, simple: true, style: 'kids' } }); const s = await probe(p);
      F(s.mode === 'simple' && s.style === 'pop' && s.kidsStyle === 0, `${tag}: mode ${s.mode} style ${s.style} kidsChip ${s.kidsStyle}`); await done(p, tag);
    }
    console.log(T, R.fails.length);
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, `rd6${process.argv[2] ? '-' + process.argv[2] : ''}.json`), JSON.stringify(R, null, 1));
  console.log(R.fails.length ? 'FAIL ' + R.fails.length + '\n' + R.fails.join('\n') : 'PASS', JSON.stringify(R.data).slice(0, 1500));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
