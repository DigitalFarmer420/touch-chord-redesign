// Kids redesign: the grown-up screens (Expert = the full app) look the same as at 351c02c (v112.13). Same saved
// setups (no `expert` key = an existing user = Expert) opened on two servers: A = 351c02c, B = this build, at 360x780,
// 780x360, 768x1024, 1024x768 (phone emulation). Screens: Kids / Pop / Jazz / Country in Full and Simple, Octave /
// Full / Fourths layouts, a song walked 3 steps, the gear menu open (B's one new row, "Expert mode", is hidden for the
// compare and counted separately). Known text changes not shot here: the How-to Kids caption and the tour line list the six songs. Pixel-exact compare of the screenshots; diffs are saved to OUT.
// node -r ./emulate.cjs grownup.cjs   env A (base URL of 351c02c), B (this build), OUT
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const A = process.env.A, B = process.env.B || process.env.BASE; if (!A || !B) { console.error('need A= and B= urls'); process.exit(2); }
const OUT = process.env.OUT || path.join(__dirname, 'out'); const DIFF = path.join(OUT, 'grownup-diff'); fs.mkdirSync(DIFF, { recursive: true });
const SIZES = process.argv[2] ? [process.argv[2].split('x').map(Number)] : [[360, 780], [780, 360], [768, 1024], [1024, 768]];
const SETUPS = [
  ['kids-full', { style: 'kids', simple: false, layout: 'octave', playAlong: true, lockKey: { pc: 0, mode: 'major' } }],
  ['kids-simple', { style: 'kids', simple: true, layout: 'octave', playAlong: true, lockKey: { pc: 0, mode: 'major' } }],
  ['pop-octave', { style: 'pop', simple: false, layout: 'octave' }], ['pop-full', { style: 'pop', simple: false, layout: 'full' }],
  ['jazz-fourths', { style: 'jazz', simple: false, layout: 'fourths' }], ['country-simple', { style: 'country', simple: true, layout: 'octave' }],
  ['pop-paoff', { style: 'pop', simple: false, layout: 'octave', playAlong: false }]
];
const R = { fails: [], data: { same: 0, compared: 0, expertRow: [] } };
async function shots(b, base, w, h, s) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:${JSON.stringify(s)}}));}}catch(e){}`);
  await ctx.addInitScript(() => { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st)); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e));
  await p.goto(base + '?test=1'); await p.waitForTimeout(1500);
  const out = {}; const snap = async n => { await p.waitForTimeout(400); out[n] = await p.screenshot(); };
  out.kv = await p.evaluate(() => document.documentElement.classList.contains('kv') || !!(document.getElementById('kv') && !document.getElementById('kv').hidden));
  await snap('main');
  await p.evaluate(() => { for (let i = 0; i < 3; i++) window.__progApi && __progApi.next(); }); await p.waitForTimeout(900); await snap('walk3');
  out.expertRow = await p.evaluate(() => !!document.getElementById('expertBtn'));
  await p.evaluate(() => { const e = document.getElementById('expertBtn'); if (e) e.style.display = 'none'; document.getElementById('configBtn').click(); }); await snap('menu');
  await p.evaluate(() => { const e = document.getElementById('expertBtn'); if (e) e.style.display = ''; }); out.menuWithRow = await p.screenshot();
  await p.evaluate(() => document.getElementById('configBtn').click()); await p.waitForTimeout(200);
  out.errs = errs; await ctx.close(); return out;
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h] of SIZES) for (const [name, s] of SETUPS) { const tag = `${w}x${h}-${name}`;
    const a = await shots(b, A, w, h, s), c = await shots(b, B, w, h, s);
    if (c.kv) R.fails.push(`${tag}: B opened the Kids view for an existing Expert setup`);
    if (!c.expertRow) R.fails.push(`${tag}: B has no Expert mode row`); else R.data.expertRow.push(tag);
    if (c.errs.length) R.fails.push(`${tag}: B page errors ${c.errs.slice(0, 2)}`);
    for (const n of ['main', 'walk3', 'menu']) { R.data.compared++;
      if (Buffer.compare(a[n], c[n]) === 0) { R.data.same++; continue; }
      fs.writeFileSync(path.join(DIFF, `${tag}-${n}-A.png`), a[n]); fs.writeFileSync(path.join(DIFF, `${tag}-${n}-B.png`), c[n]);
      R.fails.push(`${tag} ${n}: screenshot differs from 351c02c`); }
    if (tag === '360x780-pop-octave') { fs.writeFileSync(path.join(DIFF, `menu-expert-row-B.png`), c.menuWithRow); fs.writeFileSync(path.join(DIFF, `menu-A.png`), a.menu); }
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'grownup.json'), JSON.stringify(R, null, 1));
  console.log(R.fails.length ? 'FAIL ' + R.fails.length + '\n' + R.fails.slice(0, 30).join('\n') : 'PASS', `${R.data.same}/${R.data.compared} identical`);
})();
