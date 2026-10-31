// rd8: (1) a two-chart switch lands on the chord that covers the current beat (Noff rd7 Low #1); (2) the dense-layout
// note is a one-line banner on the chord panel's top edge, never over the top bar or Next (geometry at 6 sizes);
// (3) a partial Full chart reuses the Full voicings of matching sections (v1.2 Anh Da On Hon: 74 steps, Full chords).
// node -r ./emulate.cjs rd8.cjs [WxH]   env BASE, OUT, SHOTS, CMP
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const URL = process.env.URL || process.env.BASE || 'http://localhost:8080/index.html';
const OUT = process.env.OUT || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const SHOTS = process.env.SHOTS || '/tmp/tc-shots'; fs.mkdirSync(SHOTS, { recursive: true });
const CMP = process.env.CMP || ''; if (CMP) fs.mkdirSync(CMP, { recursive: true });
const ALL = [[360, 780], [412, 915], [780, 360], [844, 390], [820, 1180], [1180, 820]];
const SIZES = process.argv[2] ? [process.argv[2].split('x').map(Number)] : ALL;
const R = { fails: [], data: {} }; const F = (c, m) => { if (!c) R.fails.push(m); };
const V13 = fs.readFileSync(path.join(__dirname, '../fixtures/upload/anh-v13.json'), 'utf8');
const V12 = fs.readFileSync(path.join(__dirname, '../fixtures/upload/anh-v12.json'), 'utf8');
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
const tl = p => p.evaluate(() => { const st = __upload.steps(); let t = 0; return { pos: __magic.state.pos, steps: st.map(s => { const o = { sym: s.sym, a: t, b: t + (s.bars || 1) }; t = o.b; return o; }) }; });
const nextN = (p, n) => p.evaluate(n => { for (let i = 0; i < n; i++) document.getElementById('xNext').click(); }, n);
async function sw(p, tag, from, to, expect) {   // switch and check the landing step covers the beat the player was at
  const a = await tl(p); const t = a.pos < a.steps.length ? a.steps[a.pos].a : null;
  const e = await switchTo(p, from, to); F(!e, `${tag}: ${e}`);
  const b = await tl(p); const s = b.steps[b.pos];
  F(t != null && s && s.a <= t + 1e-6 && t < s.b - 1e-6, `${tag}: ${from} step ${a.pos} (${a.steps[a.pos] && a.steps[a.pos].sym} @${t}) -> ${to} step ${b.pos} (${s && s.sym} ${s && s.a}-${s && s.b}): does not cover the beat`);
  if (expect) F(s && s.sym.replace(/\u266d/g, 'b').replace(/\u266f/g, '#') === expect, `${tag}: landed on ${s && s.sym}, want ${expect}`);
  return { from: [a.pos, a.steps[a.pos] && a.steps[a.pos].sym, t], to: [b.pos, s && s.sym, s && s.a] };
}
async function nextIn(p, mode) { if (mode === 'expert') await p.evaluate(() => document.getElementById('xNext').click()); else await tap(p, '.pg-step'); await p.waitForTimeout(150); }

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h] of SIZES) { const T = `${w}x${h}`, D = R.data[T] = {};
    const phone = w === 360 || w === 780;
    // 1. beat mapping
    if (phone) { const tag = `${T} beat`;
      const p = await open(b, w, h, SET.expert);
      F((await p.evaluate(t => __upload.load(t), V13)).ok, `${tag}: v1.3 load`); await p.waitForTimeout(500);
      await nextN(p, 7); await p.waitForTimeout(200);
      D.v13a = await sw(p, tag + ' v1.3 E7', 'expert', 'simple', 'Bb');
      const s0 = (await tl(p)).pos; await nextIn(p, 'simple'); const s1 = (await tl(p)).pos; F(s1 === s0 + 1, `${tag}: Simple Next after the switch ${s0} -> ${s1}`);
      // Simple 1 (G7 @0.5) -> Expert G7#9 @0.5, not step 0 (after a reload the song is back at its start)
      await p.reload(); await p.waitForTimeout(1400);
      let e = await switchTo(p, 'expert', 'simple'); F(!e, `${tag}: ${e}`);
      await tap(p, '.pg-step'); await p.waitForTimeout(200);
      D.v13b = await sw(p, tag + ' v1.3 S1', 'simple', 'expert', 'G7#9');
      // a Full chord with no easy chord on its beat (Abm9 @22 in Expert chorus): lands on the easy chord covering it
      for (const n of [26, 30, 32]) {
        await p.reload(); await p.waitForTimeout(1400); await nextN(p, n); await p.waitForTimeout(150);
        D['v13e' + n] = await sw(p, `${tag} v1.3 E${n}`, 'expert', 'simple');
      }
      await done(p, tag);
      const q = await open(b, w, h, SET.expert);
      F((await q.evaluate(t => __upload.load(t), V12)).ok, `${tag}: v1.2 load`); await q.waitForTimeout(500);
      const st = await tl(q); const k = st.steps.findIndex(s => Math.abs(s.a - 50.5) < 1e-6);
      F(k > 0, `${tag}: v1.2 Expert has no chord at bar 50.5`);
      await nextN(q, k); await q.waitForTimeout(200);
      D.v12 = await sw(q, tag + ' v1.2 bar 50.5', 'expert', 'simple', 'G7');
      await done(q, tag + ' v1.2');
    }
    // 2. banner geometry
    { const tag = `${T} banner`;
      const p = await open(b, w, h, SET.full, '?test=1&hour=12');
      const g = await p.evaluate(() => { const n = document.getElementById('xDenseNote'); if (!n) return null;
        const q = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
        const nr = q(n), card = q(document.querySelector('.next-card')), t = n.querySelector('.x-note-t'), x = n.querySelector('.x-note-x');
        const ov = (a, c) => a.l < c.r - 0.5 && c.l < a.r - 0.5 && a.t < c.b - 0.5 && c.t < a.b - 0.5;
        const ctrls = [...document.querySelectorAll('#xTop button, #xTop [role=button], #xNext, #xPlay, .x-go button, .x-src button, #dev-badge')].filter(e => e.getClientRects().length && !document.querySelector('.next-card').contains(e));
        const hit = ctrls.filter(e => ov(nr, q(e))).map(e => e.id || e.className);
        const tr = q(t), xr = q(x), mid = document.elementFromPoint((tr.l + tr.r) / 2, (tr.t + tr.b) / 2);
        return { nr, card, hit, n: ctrls.length, text: t.textContent, oneLine: getComputedStyle(t).whiteSpace === 'nowrap' && t.scrollWidth <= t.clientWidth + 1 && nr.b - nr.t <= 34, xRight: xr.l > tr.r - 1 && xr.r <= nr.r + 0.5 && xr.r >= nr.r - 10,
          inside: nr.l >= card.l - 0.5 && nr.r <= card.r + 0.5 && nr.t >= card.t - 0.5 && nr.b <= card.b + 0.5, through: !n.contains(mid), pe: getComputedStyle(n).pointerEvents }; });
      D.banner = g && { r: [g.nr.l, g.nr.t, g.nr.r - g.nr.l, g.nr.b - g.nr.t].map(Math.round), card: [g.card.l, g.card.t].map(Math.round), hit: g.hit, n: g.n };
      F(g, `${tag}: no banner`);
      if (g) {
        F(g.text === 'Dense layout is here now', `${tag}: copy "${g.text}"`);
        F(g.inside, `${tag}: banner not on the chord panel ${JSON.stringify(D.banner)}`);
        F(g.n > 3 && g.hit.length === 0, `${tag}: banner overlaps ${g.hit} (${g.n} controls checked)`);
        F(g.oneLine && g.xRight, `${tag}: not one line with ✕ on the right (oneLine ${g.oneLine}, xRight ${g.xRight})`);
        F(g.through && g.pe === 'none', `${tag}: not pass-through`);
      }
      if (CMP && (w === 360 || w === 780)) await p.screenshot({ path: path.join(CMP, `${T}-banner.png`) });
      const p0 = (await p.evaluate(() => __magic.state.pos)); await tap(p, '#xNext'); await p.waitForTimeout(500);
      const p1 = await p.evaluate(() => __magic.state.pos); const gone = await p.evaluate(() => ({ el: !!document.getElementById('xDenseNote'), why: __xmode.log.denseGone }));
      F(p1 === p0 + 1 && !gone.el && gone.why === 'tap', `${tag}: Next ${p0}->${p1}, banner ${JSON.stringify(gone)}`);
      await done(p, tag);
    }
    console.log(T, R.fails.length);
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, `rd8${process.argv[2] ? '-' + process.argv[2] : ''}.json`), JSON.stringify(R, null, 1));
  console.log(R.fails.length ? 'FAIL ' + R.fails.length + '\n' + R.fails.join('\n') : 'PASS', JSON.stringify(R.data).slice(0, 3000));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
