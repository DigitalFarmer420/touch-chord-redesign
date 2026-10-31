// rd9: (1) lyrics in reused Full sections follow their own beats (v1.2 Anh: Expert line-per-step = Simple's, rd7
// timing); (2) a switch at the song's end stays at the end, no page error; (3) round trips are idempotent: every Expert
// step -> Simple -> Expert comes back to itself, and every Simple step -> Expert -> Simple too (Abmaj7 @21.5 included);
// (4) the dense banner: no interactive element, off every chip where the strip leaves room, slim (28px) under 400px,
// and a tap on a chip under / next to it plays the chip.
// node -r ./emulate.cjs rd9.cjs [WxH]   env BASE, OUT, SHOTS, CMP, FULL=1 (every step at every size)
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
const nextN = (p, n) => p.evaluate(n => { for (let i = 0; i < n; i++) document.getElementById('xNext').click(); }, n);
const st = p => p.evaluate(() => ({ pos: __magic.state.pos, n: __prog.steps.length, ver: __xmode.chart() && __xmode.chart().ver }));
const setPos = (p, i) => p.evaluate(i => { __magic.state.pos = i; }, i);
const lyrSeq = p => p.evaluate(() => { const M = __lyr2.map(), ids = __upload.song().sections, st = __upload.steps(); let t = 0; return M.at.map((k, i) => { const e = M.seq[k], o = { id: ids[e.si], li: e.li, t }; t += st[i].bars || 1; return o; }); });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h] of SIZES) { const T = `${w}x${h}`, D = R.data[T] = {};
    const phone = w === 360 || w === 780;
    // 1. lyrics in reused sections (v1.2)
    if (phone) { const tag = `${T} v1.2 lyrics`;
      const p = await open(b, w, h, SET.expert);
      F((await p.evaluate(t => __upload.load(t), V12)).ok, `${tag}: load`); await p.waitForTimeout(500);
      const ex = await lyrSeq(p);
      if (CMP && w === 360) { await nextN(p, 36); await p.waitForTimeout(500); await p.screenshot({ path: path.join(CMP, `${T}-v12-verse2a-lyrics.png`) }); }
      let e = await switchTo(p, 'expert', 'simple'); F(!e, `${tag}: ${e}`);
      const si = await lyrSeq(p);
      for (const id of ['verse2a', 'verse2b', 'chorus2', 'verse3']) {
        // each Expert step shows the line Simple shows at the same beat (Simple's timing is rd7's)
        const E = ex.filter(x => x.id === id), a = E.map(x => x.li), c = E.map(x => { let k = -1; si.forEach((y, j) => { if (y.t <= x.t + 1e-6) k = j; }); return k >= 0 && si[k].id === id ? si[k].li : 'x'; });
        F(a.length > 0 && JSON.stringify(a) === JSON.stringify(c), `${tag}: ${id} lines per step Expert ${a.join(',')} vs Simple at the same beat ${c.join(',')}`);
        F(new Set(a).size > 1, `${tag}: ${id} lyrics stall on one line (${a.join(',')})`);
        D[id] = a.join('');
      }
      await done(p, tag);
    }
    // 2. end of song, both songs
    if (phone) for (const [name, src, n] of [['v1.3', V13, 74], ['v1.2', V12, 74]]) { const tag = `${T} ${name} end`;
      const p = await open(b, w, h, SET.expert);
      F((await p.evaluate(t => __upload.load(t), src)).ok, `${tag}: load`); await p.waitForTimeout(500);
      await nextN(p, n); await p.waitForTimeout(300);
      let s = await st(p); F(s.pos === s.n && s.n === n, `${tag}: Expert after Next x${n} at ${s.pos}/${s.n}`);
      let e = await switchTo(p, 'expert', 'simple'); s = await st(p); F(!e && s.pos === s.n && s.ver === 'simple', `${tag}: Simple at ${s.pos}/${s.n} (${e})`);
      e = await switchTo(p, 'simple', 'expert'); s = await st(p); F(!e && s.pos === s.n && s.n === n && s.ver === 'full', `${tag}: back in Expert at ${s.pos}/${s.n} (${e})`);
      D[name + 'end'] = s.pos; await done(p, tag);   // done() fails on any page error (the rd8 TypeError 'si')
    }
    // 3. round trips
    if (phone) { const tag = `${T} round trip`;
      const p = await open(b, w, h, SET.expert);
      F((await p.evaluate(t => __upload.load(t), V13)).ok, `${tag}: load`); await p.waitForTimeout(500);
      const every = w === 360 || process.env.FULL === '1';
      const bad = [];
      let s = await st(p); const nE = s.n;
      const es = every ? [...Array(nE).keys()] : [0, 7, 24, 25, 26, 27, 30, 32, 50, 51, 73];
      for (const i of es) { await setPos(p, i); await switchTo(p, 'expert', 'simple'); const mid = (await st(p)).pos; await switchTo(p, 'simple', 'expert'); s = await st(p); if (s.pos !== i) bad.push(`E${i}->S${mid}->E${s.pos}`); }
      await switchTo(p, 'expert', 'simple'); const nS = (await st(p)).n;
      const ss = every ? [...Array(nS).keys()] : [0, 1, 6, 7, 24, 25, 30, 46, 52, 67];
      for (const i of ss) { await setPos(p, i); await switchTo(p, 'simple', 'expert'); const mid = (await st(p)).pos; await switchTo(p, 'expert', 'simple'); s = await st(p); if (s.pos !== i) bad.push(`S${i}->E${mid}->S${s.pos}`); }
      D.roundTrips = es.length + ss.length; D.roundBad = bad;
      F(bad.length === 0, `${tag}: ${bad.length} round trips moved: ${bad.slice(0, 12).join(' ')}`);
      // the named case: Abmaj7 @21.5
      await switchTo(p, 'simple', 'expert'); await setPos(p, 26);
      const sym = () => p.evaluate(() => __upload.steps()[__magic.state.pos].sym.replace(/\u266d/g, 'b'));
      const s0 = await sym(); await switchTo(p, 'expert', 'simple'); await switchTo(p, 'simple', 'expert'); const s1 = await sym();
      F(s0 === 'Abmaj7' && s1 === 'Abmaj7', `${tag}: Abmaj7 round trip ${s0} -> ${s1}`);
      await done(p, tag);
    }
    // 4. banner
    { const tag = `${T} banner`;
      const p = await open(b, w, h, SET.full, '?test=1&hour=12'); await p.waitForTimeout(400);
      const g = await p.evaluate(() => { const n = document.getElementById('xDenseNote'); if (!n) return null;
        const q = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
        const ov = (a, c) => a.l < c.r - 0.5 && c.l < a.r - 0.5 && a.t < c.b - 0.5 && c.t < a.b - 0.5;
        const nr = q(n), card = q(document.querySelector('.next-card'));
        const chips = [...document.querySelectorAll('#suggest .ss-chip, #suggest .ss-note')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
        const strip = chips.filter(e => { const c = q(e); return c.t < nr.b && c.b > nr.t; });
        const labels = chips.map(e => { const t = [...e.querySelectorAll('*')].find(x => [...x.childNodes].some(k => k.nodeType === 3 && k.textContent.trim())); return t ? q(t) : null; }).filter(Boolean);
        return { nr, card, h: nr.b - nr.t, inter: n.querySelectorAll('button, a, input, select, textarea, [tabindex], [role=button]').length, pe: [n, ...n.querySelectorAll('*')].every(x => getComputedStyle(x).pointerEvents === 'none'),
          chipHit: chips.filter(e => ov(nr, q(e))).map(e => e.textContent.trim()), labelHit: labels.filter(l => ov(nr, l)).length, strip: strip.map(e => e.textContent.trim()),
          ctrlHit: [...document.querySelectorAll('#xTop button, #xNext, #xPlay')].filter(e => e.getClientRects().length && ov(nr, q(e))).map(e => e.id || e.className), text: n.textContent.trim() }; });
      D.banner = g && { r: [g.nr.l, g.nr.t, g.nr.r - g.nr.l, g.h].map(Math.round), chipHit: g.chipHit, strip: g.strip };
      F(g, `${tag}: no banner`);
      if (g) {
        F(g.text === 'Dense layout is here now', `${tag}: copy "${g.text}"`);
        F(g.inter === 0 && g.pe, `${tag}: banner has an interactive element (${g.inter}) or takes taps`);
        F(g.ctrlHit.length === 0, `${tag}: overlaps ${g.ctrlHit}`);
        F(g.chipHit.length === 0, `${tag}: covers chips ${g.chipHit}`);
        F(g.labelHit === 0, `${tag}: covers a chord name`);
        F(h < 400 ? Math.abs(g.h - 28) < 0.6 : g.h <= 32, `${tag}: height ${g.h}`);
        F(g.nr.l >= g.card.l && g.nr.r <= g.card.r && g.nr.t >= g.card.t, `${tag}: not on the chord panel`);
      }
      if (CMP && (w === 360 || w === 780)) await p.screenshot({ path: path.join(CMP, `${T}-banner.png`) });
      // a tap on the chip nearest the banner (in its strip, else the first chip) plays it, and fades the banner
      await p.evaluate(() => { const A = window.ChordAudio; window.__pc = []; const o = A.playChord.bind(A); A.playChord = function (g, m, op) { window.__pc.push((m || []).length); return o(g, m, op); }; });
      const c = await p.evaluate(() => { const n = document.getElementById('xDenseNote').getBoundingClientRect(); const ch = [...document.querySelectorAll('#suggest .ss-chip')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
        const by = ch.map(e => ({ e, r: e.getBoundingClientRect() })).sort((a, b) => Math.abs(a.r.top - n.bottom) - Math.abs(b.r.top - n.bottom))[0]; const r = by.r;
        // a point inside the chip that is also under the banner if they meet, else the chip's top part
        const y = Math.max(r.top + 3, Math.min(r.bottom - 3, n.bottom - 2)); return { x: r.left + r.width / 2, y, under: y < n.bottom && y > n.top && r.left + r.width / 2 > n.left && r.left + r.width / 2 < n.right, txt: by.e.textContent.trim() }; });
      await touch(p, c.x, c.y, 90); await p.waitForTimeout(500);
      const after = await p.evaluate(() => ({ notes: window.__pc.filter(k => k >= 3).length, el: !!document.getElementById('xDenseNote'), why: __xmode.log.denseGone }));
      D.bannerTap = { chip: c.txt, under: c.under, notes: after.notes };
      F(after.notes > 0, `${tag}: tap on chip ${c.txt} did not play (under the banner: ${c.under})`);
      F(!after.el && after.why === 'tap', `${tag}: banner did not fade on the first tap ${JSON.stringify(after)}`);
      await done(p, tag);
      // pass-through: the banner laid right over a chip (test only) - a tap on that chip still plays it
      const p2 = await open(b, w, h, SET.full, '?test=1&hour=12'); await p2.waitForTimeout(400);
      const o = await p2.evaluate(() => { const n = document.getElementById('xDenseNote'), c = [...document.querySelectorAll('#suggest .ss-chip')].find(e => e.getClientRects().length), r = c.getBoundingClientRect();
        n.style.left = r.left + 'px'; n.style.top = (r.top + r.height / 2 - 15) + 'px'; const x = r.left + Math.min(r.width / 2, 40), y = r.top + r.height / 2, nr = n.getBoundingClientRect();
        const A = window.ChordAudio; window.__pc = []; const f = A.playChord.bind(A); A.playChord = function (g, m, op) { window.__pc.push((m || []).length); return f(g, m, op); };
        return { x, y, covered: x > nr.left && x < nr.right && y > nr.top && y < nr.bottom, hit: c.contains(document.elementFromPoint(x, y)), txt: c.textContent.trim() }; });
      await touch(p2, o.x, o.y, 90); await p2.waitForTimeout(500);
      const a2 = await p2.evaluate(() => ({ notes: window.__pc.filter(k => k >= 3).length, el: !!document.getElementById('xDenseNote'), why: __xmode.log.denseGone }));
      D.underTap = { chip: o.txt, covered: o.covered, hit: o.hit, notes: a2.notes };
      F(o.covered && o.hit && a2.notes > 0 && !a2.el && a2.why === 'tap', `${tag}: tap through the banner on chip ${o.txt} ${JSON.stringify({ o, a2 })}`);
      await done(p2, tag + ' under');
    }
    console.log(T, R.fails.length);
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, `rd9${process.argv[2] ? '-' + process.argv[2] : ''}.json`), JSON.stringify(R, null, 1));
  console.log(R.fails.length ? 'FAIL ' + R.fails.length + '\n' + R.fails.join('\n') : 'PASS', JSON.stringify(R.data).slice(0, 3000));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
