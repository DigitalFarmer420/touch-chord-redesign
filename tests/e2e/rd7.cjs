// rd7: the tester findings on rd6 (Noff /workspace/chord-touch/rd6/SUMMARY.md) and Uiux's Low / Info items.
//   1. Expert (and Simple) Start over during Play song: playback stops, the cursor stops, no more notes.
//   2. Two-chart upload (v1.3 Anh Da On Hon): Expert Next x6 -> Simple lands on the same bar; Simple 3 more -> Expert same bar.
//   3. v1.2 Anh Da On Hon (partial Full chart): Expert plays the whole song (as many bars as Simple, not 33 steps).
//   4. Kids: step 3 -> reload in Kids -> Hello -> Start resumes at step 3; the same song card resumes too; another song starts at 0.
//   5. Dense-layout toast (360x780, 780x360): under the top bar, taps go through it (Next works while it shows), it
//      fades on the first tap or after ~6 s; ✕ still closes it.
//   6/7. Simple's sheet: no Look row, no footer copy.   8. Expert's "?" is the same 44px circle as Simple's.
// node -r ./emulate.cjs rd7.cjs [WxH]   env BASE, OUT, SHOTS, CMP
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const URL = process.env.URL || process.env.BASE || 'http://localhost:8080/index.html';
const OUT = process.env.OUT || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const SHOTS = process.env.SHOTS || '/tmp/tc-shots'; fs.mkdirSync(SHOTS, { recursive: true });
const CMP = process.env.CMP || ''; if (CMP) fs.mkdirSync(CMP, { recursive: true });
const SIZES = process.argv[2] ? [process.argv[2].split('x').map(Number)] : [[360, 780], [780, 360]];
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
const REC = () => { const A = window.ChordAudio; window.__n = 0; if (A.__r7) return; A.__r7 = 1; for (const f of ['playChord', 'morphChord']) { const o = A[f].bind(A); A[f] = function (...a) { window.__n++; return o(...a); }; } };
const pos = p => p.evaluate(() => ({ pos: __magic.state.pos, n: __prog.steps.length, bars: __prog.steps.map(s => s.bars || 1), playing: !!__prog.playing, cur: __prog.cur }));
const barAt = (bars, i) => bars.slice(0, i).reduce((a, b) => a + b, 0);
async function eraseHold(p) { await tap(p, '#msReset'); await p.waitForTimeout(250); const r = await rectOf(p, '#msConfirm .ms-erase'); if (!r) return false; await touch(p, r.x, r.y, 2300); await p.waitForTimeout(300); return true; }

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h] of SIZES) { const T = `${w}x${h}`, D = R.data[T] = {};
    // 1. Start over stops Play song (Expert; Simple for parity)
    for (const mode of ['expert', 'simple']) { const tag = `${T} ${mode} start over`;
      const p = await open(b, w, h, SET[mode]); await p.evaluate(REC);
      await tap(p, mode === 'expert' ? '#xPlay' : '.pg-song'); await p.waitForTimeout(2200);
      let s = await pos(p); const n0 = await p.evaluate(() => __n);
      F(s.playing && (await p.evaluate(() => __n)) > 0, `${tag}: Play song did not start (${JSON.stringify({ playing: s.playing, n0 })})`);
      F(await openSheet(p, mode), `${tag}: sheet`); F(await eraseHold(p), `${tag}: no erase button`);
      await p.waitForTimeout(200); const a = await pos(p); const nA = await p.evaluate(() => __n);
      await p.waitForTimeout(3000); const z = await pos(p); const nZ = await p.evaluate(() => __n);
      D[mode + 'StartOver'] = { a, z: { playing: z.playing, cur: z.cur }, notesAfter: nZ - nA };
      F(!a.playing && !z.playing && a.cur === z.cur && nZ === nA, `${tag}: still playing after Start over (playing ${z.playing}, cur ${a.cur}->${z.cur}, ${nZ - nA} notes)`);
      F((await probe(p)).mode === mode, `${tag}: mode after Start over ${(await probe(p)).mode}`);
      await done(p, tag);
    }
    // 2. two-chart upload keeps the bar across Expert <-> Simple
    { const tag = `${T} v1.3 switch`;
      const p = await open(b, w, h, SET.expert);
      const ld = await p.evaluate(t => __upload.load(t), V13); F(ld.ok, `${tag}: load ${JSON.stringify(ld.errors)}`); await p.waitForTimeout(600);
      let c = await p.evaluate(() => __xmode.chart()); F(c && c.two && c.ver === 'full', `${tag}: Expert chart ${JSON.stringify(c)}`);
      for (let i = 0; i < 6; i++) { await tap(p, '#xNext'); await p.waitForTimeout(250); }
      let e0 = await pos(p); F(e0.pos === 6, `${tag}: Expert after Next x6 at ${e0.pos}`);
      const bar = Math.floor(barAt(e0.bars, e0.pos) + 1e-6);
      let er = await switchTo(p, 'expert', 'simple'); F(!er, `${tag}: ${er}`);
      let s1 = await pos(p); c = await p.evaluate(() => __xmode.chart());
      const a1 = barAt(s1.bars, s1.pos), b1 = a1 + s1.bars[s1.pos];
      F(c.ver === 'simple' && s1.pos > 0 && a1 <= bar + 1e-6 && bar < b1 - 1e-6, `${tag}: Simple at step ${s1.pos} (bars ${a1}-${b1}), want the step on bar ${bar}`);
      D.v13 = { expert: { pos: e0.pos, n: e0.n, bar }, simple: { pos: s1.pos, n: s1.n, a1 } };
      for (let i = 0; i < 3; i++) { await tap(p, '.pg-step'); await p.waitForTimeout(250); }
      let s2 = await pos(p); F(s2.pos === s1.pos + 3, `${tag}: Simple Next x3 ${s1.pos} -> ${s2.pos}`);
      const bar2 = Math.floor(barAt(s2.bars, s2.pos) + 1e-6);
      er = await switchTo(p, 'simple', 'expert'); F(!er, `${tag}: ${er}`);
      const e2 = await pos(p); const a2 = barAt(e2.bars, e2.pos), b2 = a2 + e2.bars[e2.pos];
      F(e2.pos > 0 && a2 <= bar2 + 1e-6 && bar2 < b2 - 1e-6, `${tag}: back in Expert at step ${e2.pos} (bars ${a2}-${b2}), want bar ${bar2} (Simple step ${s2.pos})`);
      D.v13.back = { simple: s2.pos, bar2, expert: e2.pos };
      await done(p, tag);
    }
    // 3. v1.2 partial Full chart: the whole song in Expert
    { const tag = `${T} v1.2 partial full`;
      const p = await open(b, w, h, SET.expert);
      const ld = await p.evaluate(t => __upload.load(t), V12); F(ld.ok, `${tag}: load ${JSON.stringify(ld.errors)}`); await p.waitForTimeout(600);
      const e = await pos(p); const c = await p.evaluate(() => __xmode.chart());
      const er = await switchTo(p, 'expert', 'simple'); const s = await pos(p);
      const eb = e.bars.reduce((a, x) => a + x, 0), sb = s.bars.reduce((a, x) => a + x, 0);
      D.v12 = { expert: e.n, expertBars: eb, simple: s.n, simpleBars: sb, ver: c && c.ver };
      F(!er && c && c.ver === 'full' && e.n > 33 && Math.abs(eb - sb) < 1e-6, `${tag}: Expert ${e.n} steps / ${eb} bars vs Simple ${s.n} / ${sb} (chart ${c && c.ver})`);
      await done(p, tag);
    }
    // 4. Kids: the step survives a reload in Kids (Start / same card resume it)
    { const tag = `${T} kids reload`;
      const p = await open(b, w, h, SET.kids);
      await tap(p, '#kv .kv-go'); await p.waitForTimeout(300);
      await p.evaluate(() => [...document.querySelectorAll('#kv .kv-card')].find(c => c.dataset.song === 'Kids Old MacDonald').click()); await p.waitForTimeout(300);
      for (let i = 0; i < 3; i++) { await tap(p, '#kv .kv-ctl .kv-next'); await p.waitForTimeout(200); }
      let s = await probe(p); F(s.pos === 3, `${tag}: setup @${s.pos}`);
      await p.reload(); await p.waitForTimeout(1400); s = await probe(p); F(s.screen === 'hello', `${tag}: reload opened ${s.screen} (want Hello)`);
      await tap(p, '#kv .kv-go'); await p.waitForTimeout(400); s = await probe(p);
      F(s.screen === 'play' && s.song === 'Kids Old MacDonald' && s.pos === 3, `${tag}: Start -> ${s.screen} ${s.song} @${s.pos} (want play Old MacDonald @3)`);
      D.kidsStart = { screen: s.screen, pos: s.pos };
      await p.reload(); await p.waitForTimeout(1400);
      await p.evaluate(() => __kv.show('songs')); await p.waitForTimeout(300);
      await p.evaluate(() => [...document.querySelectorAll('#kv .kv-card')].find(c => c.dataset.song === 'Kids Old MacDonald').click()); await p.waitForTimeout(400);
      s = await probe(p); F(s.screen === 'play' && s.pos === 3, `${tag}: same song card -> ${s.screen} @${s.pos} (want @3)`);
      await p.reload(); await p.waitForTimeout(1400);
      await p.evaluate(() => __kv.show('songs')); await p.waitForTimeout(300);
      await p.evaluate(() => [...document.querySelectorAll('#kv .kv-card')].find(c => c.dataset.song === 'Kids Twinkle').click()); await p.waitForTimeout(400);
      s = await probe(p); F(s.song === 'Kids Twinkle' && s.pos === 0, `${tag}: another song -> ${s.song} @${s.pos} (want Twinkle @0)`);
      await done(p, tag);
    }
    // 5. dense-layout toast: pass-through, Next works under it, fades on a tap / after ~6 s, ✕ closes
    { const tag = `${T} dense toast`;
      const p = await open(b, w, h, SET.full, '?test=1&hour=12');
      const t = await p.evaluate(() => { const n = document.getElementById('xDenseNote'); if (!n) return null; const r = n.getBoundingClientRect(), top = document.getElementById('xTop').getBoundingClientRect(); const cs = getComputedStyle(n);
        const hit = document.elementFromPoint(r.x + 12, r.y + r.height / 2); return { y: r.y, b: r.bottom, topB: top.bottom, pe: cs.pointerEvents, xpe: getComputedStyle(n.querySelector('.x-note-x')).pointerEvents, through: !n.contains(hit), r: [r.x, r.y, r.width, r.height].map(Math.round) }; });
      D.toast = t;
      F(t && t.pe === 'none' && t.xpe === 'auto' && t.through, `${tag}: toast is not pass-through ${JSON.stringify(t)}`);
      F(t && t.y >= t.topB - 0.5 && t.y <= t.topB + 16, `${tag}: toast not just under the top bar ${JSON.stringify(t)}`);
      if (CMP && w === 360) await p.screenshot({ path: path.join(CMP, `${process.env.PFX || 'after'}-${T}-dense-toast.png`) });
      const p0 = (await pos(p)).pos;
      const nx = await rectOf(p, '#xNext'); await touch(p, nx.x, nx.y, 60); await p.waitForTimeout(300);
      const p1 = (await pos(p)).pos; F(p1 === p0 + 1, `${tag}: Next under / beside the toast did not move on (${p0} -> ${p1})`);
      await p.waitForTimeout(500); let g = await p.evaluate(() => ({ el: !!document.getElementById('xDenseNote'), why: __xmode.log.denseGone }));
      F(!g.el && g.why === 'tap', `${tag}: the first tap did not fade the toast ${JSON.stringify(g)}`);
      await done(p, tag);
      const q = await open(b, w, h, SET.full, '?test=1&hour=12'); await q.waitForTimeout(3000);
      g = await q.evaluate(() => ({ el: !!document.getElementById('xDenseNote') })); F(g.el, `${tag}: gone before 6 s`);
      await q.waitForTimeout(2600); g = await q.evaluate(() => ({ el: !!document.getElementById('xDenseNote'), why: __xmode.log.denseGone })); F(!g.el && g.why === 'time', `${tag}: not gone after ~6 s ${JSON.stringify(g)}`);
      await done(q, tag + ' timer');
      const x = await open(b, w, h, SET.full, '?test=1&hour=12'); await tap(x, '#xDenseNote .x-note-x'); await x.waitForTimeout(200);
      g = await x.evaluate(() => ({ el: !!document.getElementById('xDenseNote'), why: __xmode.log.denseGone })); F(!g.el && g.why === 'x', `${tag}: ✕ ${JSON.stringify(g)}`);
      await done(x, tag + ' x');
    }
    // 6 / 7. Simple's sheet: no Look row, no footer copy
    { const tag = `${T} simple sheet`;
      const p = await open(b, w, h, SET.simple); F(await openSheet(p, 'simple'), `${tag}: sheet`);
      const r = await p.evaluate(() => ({ look: !!document.querySelector('#modeSheet .ms-look').getClientRects().length, note: document.getElementById('msNote').textContent, text: document.querySelector('#modeSheet .ms-sheet').innerText }));
      F(!r.look, `${tag}: Look row shown`); F(!r.note && !/No more Simple|Lamp look is coming|coming next/.test(r.text), `${tag}: footer / roadmap copy "${r.note}"`);
      if (CMP) await p.screenshot({ path: path.join(CMP, `${process.env.PFX || 'after'}-${T}-simple-sheet.png`) });
      await done(p, tag);
    }
    // 8. Expert's "?" = Simple's 44px circle
    { const tag = `${T} help circle`;
      const geo = async (p, sel) => p.evaluate(s => { const e = document.querySelector(s); const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), rad: cs.borderTopLeftRadius, svg: !!e.querySelector('svg circle'), txt: e.textContent.trim() }; }, sel);
      const p = await open(b, w, h, SET.expert); const x = await geo(p, '#xHelp');
      if (CMP) await p.screenshot({ path: path.join(CMP, `${process.env.PFX || 'after'}-${T}-expert-top.png`), clip: { x: 0, y: 0, width: w, height: 120 } });
      await done(p, tag);
      const q = await open(b, w, h, SET.simple); const s = await geo(q, '#howtoBtn'); await done(q, tag + ' simple');
      D.help = { expert: x, simple: s };
      F(x.svg && !x.txt && Math.abs(x.w - x.h) < 0.6 && Math.abs(x.w - s.w) < 0.6 && Math.abs(x.h - s.h) < 0.6 && (x.rad === '50%' || parseFloat(x.rad) >= x.w / 2 - 0.5), `${tag}: Expert ? ${JSON.stringify(x)} vs Simple ${JSON.stringify(s)}`);
    }
    console.log(T, R.fails.length);
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, `rd7${process.argv[2] ? '-' + process.argv[2] : ''}.json`), JSON.stringify(R, null, 1));
  console.log(R.fails.length ? 'FAIL ' + R.fails.length + '\n' + R.fails.join('\n') : 'PASS', JSON.stringify(R.data).slice(0, 2500));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
