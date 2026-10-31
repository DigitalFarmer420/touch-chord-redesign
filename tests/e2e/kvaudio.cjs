// Kids redesign: the Kids view sounds exactly like the Kids style it sits on. Same app, same saved Kids setup (C major,
// Play along off so no tap is a gold step), 360x780 + 780x360: each of the 7 pads, each of the 12 piano keys C4..B4,
// Next x3 and Play song (first 4 steps) in Expert (the full app's Kids pads #suggest .ss-kidpad, the Octave keyboard
// #pads .pad, #progNext-style magic.js progNext) and in Simple (the Kids view). Every audio-engine call (playChord /
// morphChord / stopChord / protectGroup / fadeGroup: group kind, notes, bass, options) must match. The five black keys
// are out of C major, so they are silent in both (the Kids style rule).
// node -r ./emulate.cjs kvaudio.cjs [WxH]   env BASE, OUT
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const URL = process.env.URL || process.env.BASE || 'http://localhost:8080/index.html';
const OUT = process.env.OUT || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const SIZES = process.argv[2] ? [process.argv[2].split('x').map(Number)] : [[360, 780], [780, 360]];
const R = { fails: [], data: {} };
const HOOK = () => { const A = window.ChordAudio; window.__L = []; if (A.__kva) return; A.__kva = 1;
  const clean = v => v == null ? v : typeof v === 'function' ? 'fn' : Array.isArray(v) ? v.map(clean) : typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().filter(k => !/^(t|time|when|at|start)$/.test(k)).map(k => [k, clean(v[k])])) : v;
  for (const f of ['playChord', 'morphChord', 'stopChord', 'protectGroup', 'fadeGroup']) { const o = A[f]; if (typeof o !== 'function') continue;
    A[f] = function (...a) { window.__L.push([f, String(a[0]).replace(/\d+/g, '#'), ...a.slice(1).map(clean)]); return o.apply(this, a); }; } };
async function run(b, w, h, expert) {
  const s = { style: 'kids', simple: false, layout: 'octave', playAlong: false, lockKey: { pc: 0, mode: 'major' }, expert, theme: 'day', kidsSong: 'Kids Twinkle' };
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:${JSON.stringify(s)}}));}}catch(e){}`);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e));
  await p.goto(URL + '?test=1&classic=1&hour=12'); await p.waitForTimeout(1300); await p.evaluate(HOOK);
  if (!expert) { await p.evaluate(() => { document.querySelector('#kv .kv-go').click(); }); await p.waitForTimeout(400); }
  const cdp = await ctx.newCDPSession(p);
  const touchAt = async (x, y, ms) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await p.waitForTimeout(ms); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(350); };
  const rect = sel => p.evaluate(s => { const e = typeof s === 'string' ? document.querySelector(s) : null; if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height * 0.8 }; }, sel);
  const take = async () => p.evaluate(() => { const l = window.__L; window.__L = []; return l; });
  const out = {};
  for (const pc of [0, 2, 4, 5, 7, 9, 11]) {
    const sel = expert ? await p.evaluate(pc => { const e = [...document.querySelectorAll('#suggest .ss-kidpad')].find(x => x._tc && ((x._tc.item.rootPc % 12) + 12) % 12 === pc); if (!e) return null; e.setAttribute('data-kva', pc); return `#suggest .ss-kidpad[data-kva="${pc}"]`; }, pc) : `#kv .kv-pad[data-pc="${pc}"]`;
    const r = sel && await rect(sel); if (!r) { R.fails.push(`${w}x${h} ${expert ? 'Expert' : 'Simple'}: no pad ${pc}`); continue; }
    await take(); await touchAt(r.x, r.y, 160); out['pad' + pc] = await take(); }
  for (let m = 60; m < 72; m++) {
    const sel = expert ? `#pads .pad[data-midi="${m}"]` : `#kv [data-midi="${m}"]`;
    const r = await rect(sel); if (!r) { R.fails.push(`${w}x${h} ${expert ? 'Expert' : 'Simple'}: no key ${m}`); continue; }
    await take(); await touchAt(r.x, r.y, 160); out['key' + m] = await take(); }
  await take(); for (let i = 0; i < 3; i++) { await p.evaluate(ex => ex ? __progApi.next() : document.querySelector('#kv .kv-ctl .kv-next').click(), expert); await p.waitForTimeout(450); } out.next3 = await take();
  await p.evaluate(ex => ex ? __progApi.play() : document.querySelector('#kv .kv-playbtn').click(), expert); await p.waitForTimeout(1400); await p.evaluate(() => __progApi.stop()); await p.waitForTimeout(300);
  out.play = (await take()).filter(x => x[0] === 'playChord' || x[0] === 'morphChord').slice(0, 4);
  out.errs = errs; await ctx.close(); return out;
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h] of SIZES) { const tag = `${w}x${h}`;
    const e = await run(b, w, h, true), s = await run(b, w, h, false); let calls = 0, same = 0;
    for (const k of Object.keys(e)) { if (k === 'errs') continue; calls += e[k].length; const blk = /^key(61|63|66|68|70)$/.test(k); if (!e[k].length !== blk) R.fails.push(`${tag} ${k}: ${blk ? 'an out-of-key black key sounds' : 'no sound'} in Expert`);
      if (JSON.stringify(e[k]) === JSON.stringify(s[k])) same++; else R.fails.push(`${tag} ${k}: Simple ${JSON.stringify(s[k]).slice(0, 300)} vs Expert ${JSON.stringify(e[k]).slice(0, 300)}`); }
    if (e.errs.length || s.errs.length) R.fails.push(`${tag}: page errors ${e.errs.concat(s.errs).slice(0, 3)}`);
    R.data[tag] = { actions: Object.keys(e).length - 1, same, calls }; }
  await b.close(); fs.writeFileSync(path.join(OUT, 'kvaudio.json'), JSON.stringify(R, null, 1));
  console.log(R.fails.length ? 'FAIL ' + R.fails.length + '\n' + R.fails.slice(0, 20).join('\n') : 'PASS', JSON.stringify(R.data));
})();
