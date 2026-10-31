// Audio equivalence: record every call the app makes to the audio engine (playChord / stopChord / morphChord /
// protectGroup / fadeGroup: group, notes, options, scheduled time relative to the call) for a scripted set of taps
// in every style and layout, and write it to OUT/audioeq-<tag>.json. Compare two recordings with
//   node tests/e2e/audioeq.cjs --compare a.json b.json
// Run: BASE=http://127.0.0.1:PORT/index.html OUT=dir TAG=name node -r ./emulate.cjs audioeq.cjs
const fs = require('fs'), path = require('path');
if (process.argv[2] === '--compare') {
  const A = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), B = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
  const fails = []; let calls = 0;
  for (const k of Object.keys(A.runs)) {
    const a = JSON.stringify(A.runs[k]), b = JSON.stringify(B.runs[k]); calls += A.runs[k].length;
    if (a !== b) { const x = A.runs[k], y = B.runs[k] || []; let i = 0; while (i < x.length && JSON.stringify(x[i]) === JSON.stringify(y[i])) i++; fails.push({ run: k, at: i, a: x[i], b: y[i], na: x.length, nb: y.length }); }
  }
  for (const k of Object.keys(B.runs)) if (!(k in A.runs)) fails.push({ run: k, missingIn: 'a' });
  const res = { runs: Object.keys(A.runs).length, calls, fails };
  console.log(JSON.stringify(res, null, 1)); if (process.env.OUT) fs.writeFileSync(path.join(process.env.OUT, 'audioeq-compare.json'), JSON.stringify(res, null, 1));
  process.exit(fails.length ? 1 : 0);
}
const { chromium } = require('playwright-core');
const U = process.env.BASE || 'http://127.0.0.1:8080/index.html', OUT = process.env.OUT || '/tmp', TAG = process.env.TAG || 'run';
// rd6: the classic Full layout is gone for users; '&classic=1' (test-only, ignored by older builds) keeps it so the
// recording replays the same taps as 351c02c. REAL=1 instead plays the real rd6 modes (Expert pref on for the non-Simple
// configs, no classic hatch) to compare two builds that both have Expert (cd19e41 vs rd6). hour=12 fixes the Auto look.
const REAL = process.env.REAL === '1', Q = REAL ? '?test=1&hour=12' : '?test=1&classic=1&hour=12';
const REC = `(() => { const T = () => { const A = window.ChordAudio; if (!A || !A.playChord) return setTimeout(T, 5); if (A.__rec) return; A.__rec = [];
  const now = () => (A.ctx ? A.ctx.currentTime : 0), rt = t => t == null ? null : Math.round((t - now()) * 200) / 200;
  const g = x => String(x);
  ['playChord', 'morphChord'].forEach(f => { const o = A[f].bind(A); A[f] = function (gr, m, op) { op = op || {}; A.__rec.push([f, g(gr), (m || []).slice(), op.bass == null ? null : op.bass, op.sound || null, !!op.key, op.time == null ? null : 'T']); if (op.time != null) A.__rec.push(['@', op.time]); return o.apply(null, arguments); }; });
  ['stopChord'].forEach(f => { const o = A[f].bind(A); A[f] = function (gr, t, r, cut) { A.__rec.push([f, g(gr), t == null ? null : 'T', r == null ? null : r, !!cut]); return o.apply(null, arguments); }; });
  ['protectGroup', 'fadeGroup'].forEach(f => { const o = A[f].bind(A); A[f] = function (gr) { A.__rec.push([f, g(gr)]); return o.apply(null, arguments); }; });
}; T(); })();`;
const STYLES = ['pop', 'kids', 'jazz', 'rnb', 'ballad', 'reggae', 'funk', 'yogaDeep', 'country'];
const CONFIGS = [];
for (const st of STYLES) for (const lay of ['octave', 'full', 'fourths']) CONFIGS.push({ style: st, layout: lay, simple: false });
for (const st of ['pop', 'kids', 'jazz']) CONFIGS.push({ style: st, layout: 'octave', simple: true });
for (const st of ['pop', 'kids']) CONFIGS.push({ style: st, layout: 'octave', simple: false, playAlong: false });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  const runs = {}, errs = [];
  for (const [w, h] of [[360, 780], [780, 360]]) for (const c of CONFIGS) {
    const tag = `${w}x${h}-${c.style}-${c.layout}-${c.simple ? 'simple' : 'full'}${c.playAlong === false ? '-paoff' : ''}`;
    const s = Object.assign({ lockKey: { pc: 0, mode: 'major' }, playAlong: true, expert: true }, c);
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:${JSON.stringify(s)}}));${REAL && !c.simple ? "localStorage.setItem('touchChord.expert.v1',JSON.stringify({on:true}));" : ''}}}catch(e){}`);
    await ctx.addInitScript(REC);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(tag + ': ' + e));
    await p.goto(U + Q); await p.waitForTimeout(900);
    await p.evaluate(async () => {
      const W = ms => new Promise(r => setTimeout(r, ms));
      const ev = (el, type, id, x, y) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', isPrimary: id === 1, button: 0, clientX: x != null ? x : r.left + r.width / 2, clientY: y != null ? y : r.top + r.height * 0.75 })); };
      const A = window.ChordAudio; if (A.ctx && A.ctx.resume) await A.ctx.resume(); A.__rec.length = 0;
      const keys = () => Array.from(document.querySelectorAll('#pads .pad')).filter(k => !k.classList.contains('out') && k.getClientRects().length);
      A.__rec.push(['#', 'keys']);
      for (let i = 0; i < 8; i++) { const k = keys()[i]; if (!k) break; ev(k, 'pointerdown', 2 + i); await W(70); ev(k, 'pointerup', 2 + i); await W(70); }
      A.__rec.push(['#', 'two']);
      { const ks = keys(); if (ks[0] && ks[4]) { ev(ks[0], 'pointerdown', 21); await W(40); ev(ks[4], 'pointerdown', 22); await W(120); ev(ks[0], 'pointerup', 21); await W(40); ev(ks[4], 'pointerup', 22); await W(80); } }
      A.__rec.push(['#', 'slide']);
      { const ks = keys(); if (ks[1] && ks[2]) { ev(ks[1], 'pointerdown', 31); await W(80); const r = ks[2].getBoundingClientRect(); ev(ks[1], 'pointermove', 31, r.left + r.width / 2, r.top + r.height * 0.75); await W(80); ev(ks[1], 'pointerup', 31); await W(80); } }
      A.__rec.push(['#', 'hold']);
      { const ks = keys(); if (ks[3]) { ev(ks[3], 'pointerdown', 41); await W(700); ev(ks[3], 'pointerup', 41); await W(100); } }
      A.__rec.push(['#', 'chips']);
      const chips = Array.from(document.querySelectorAll('#suggest .ss-chip, #suggest .ss-note')).filter(x => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden').slice(0, 4);
      for (let i = 0; i < chips.length; i++) { ev(chips[i], 'pointerdown', 51 + i); await W(80); ev(chips[i], 'pointerup', 51 + i); await W(120); }
      await W(1700);
      A.__rec.push(['#', 'next']);
      const nx = document.querySelector('#prog .pg-step'); for (let i = 0; i < 3 && nx; i++) { nx.click(); await W(150); }
      await W(300);
      A.__rec.push(['#', 'goldkey']);
      { const gk = document.querySelector('#pads .pad.nx-root'); if (gk) { ev(gk, 'pointerdown', 61); await W(60); ev(gk, 'pointerup', 61); await W(120); } }
      A.__rec.push(['#', 'play']);
      const pl = document.querySelector('#prog .pg-song'); if (pl) { pl.click(); await W(1400); pl.click(); await W(200); }
    });
    let rec = await p.evaluate(() => window.ChordAudio.__rec);
    // Play song: only the first 4 scheduled steps (the lookahead count depends on the box's speed); relative times kept
    const at = rec.findIndex(x => x[0] === '#' && x[1] === 'play');
    if (at >= 0) { const tail = rec.slice(at); let n = 0, cut = tail.length; for (let i = 0; i < tail.length; i++) { if (tail[i][0] === 'playChord' && tail[i][6] === 'T') { n++; if (n > 4) { cut = i; break; } } } rec = rec.slice(0, at).concat(tail.slice(0, cut).filter(x => x[0] !== 'stopChord' || x[2] !== 'T')); }
    let t0 = null; rec = rec.map(x => { if (x[0] !== '@') return x; if (t0 == null) t0 = x[1]; return ['@', Math.round((x[1] - t0) * 1000)]; });
    runs[tag] = rec; await ctx.close(); process.stdout.write('.');
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, `audioeq-${TAG}.json`), JSON.stringify({ runs, errs }));
  console.log('\nrecorded', Object.keys(runs).length, 'runs', errs.length, 'page errors'); if (errs.length) console.log(errs.slice(0, 5));
})();
