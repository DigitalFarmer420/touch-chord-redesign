// rd5.1: every mode switch leaves exactly one screen. rd5 bug: a page that loaded (or reloaded) in Expert or Simple and
// then switched to Kids showed Hello, Songs and Play stacked (3 gears, Hello's big play disc behind the pads, blank song
// chip and lyrics, no gold key). For each start mode (Kids / Expert / Simple, entered and then RELOADED so the page boots
// in it), with and without a Kids song in progress, walk every ordered pair of modes (K->E, E->S, S->K, K->S, S->E, E->K)
// and after every switch assert:
//  - in Kids: exactly one visible Kids screen and one visible gear; never Hello on a switch (Hello is only for opening the
//    app); a kept song lands on its play screen with the same song and step, the chip and lyrics filled and exactly one
//    gold key, Hello's disc / title / notes hidden; no song = the song list (six cards);
//  - in Expert / Simple: #kv hidden, no Kids screen or gear visible, html.expert / html.simple as asked.
// No page errors. node -r ./emulate.cjs modeswitch.cjs [WxH]   env BASE / URL, OUT, SHOTS
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const URL = process.env.URL || process.env.BASE || 'http://localhost:8080/index.html';
const OUT = process.env.OUT || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const SHOTS = process.env.MS_SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const SIZES = process.argv[2] ? [process.argv[2].split('x').map(Number)] : [[360, 780], [412, 915], [780, 360]];
const PATH = ['kids', 'expert', 'simple', 'kids', 'simple', 'expert', 'kids'];   // every ordered pair once
const R = { fails: [], data: {} }; const F = (c, m) => { if (!c) R.fails.push(m); };
const probe = p => p.evaluate(() => {
  const de = document.documentElement, kv = document.getElementById('kv');
  const v = e => !!(e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
  const n = s => [...document.querySelectorAll(s)].filter(v).length;
  return { kv: de.classList.contains('kv') && v(kv), expert: de.classList.contains('expert'), simple: de.classList.contains('simple'), screen: kv.dataset.screen,
    scr: n('#kv .kv-scr'), gears: n('#kv .kv-gear'), hello: n('#kv .kv-go, #kv .kv-title, #kv .kv-notes'), cards: n('#kv .kv-card'),
    chip: kv.querySelector('.kv-chip').textContent.trim(), lyr: kv.querySelector('.kv-lyr').textContent.trim(), gold: n('#kv .kv-wk.gold, #kv .kv-bk.gold'),
    song: __prog.list[__prog.idx] && __prog.list[__prog.idx].name, cur: __prog.cur, pos: __magic.state.pos };
});
// the real switch controls of each mode (Kids settings, Expert settings, the classic gear menu)
const go = (p, from, to) => p.evaluate(([from, to]) => {
  const sel = from === 'kids' ? `#kvMode button[data-v="${to}"]` : from === 'expert' ? `#xSettings .x-mode [data-mode="${to}"]` : `#modeRow button[data-mode="${to}"]`;
  const b = document.querySelector(sel); if (!b) return sel; b.click(); return null;
}, [from, to]);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h] of SIZES) for (const start of ['kids', 'expert', 'simple']) for (const song of [true, false]) {
    const tag = `${w}x${h} ${start} ${song ? 'song' : 'nosong'}`; const D = R.data[tag] = [];
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');}}catch(e){}`);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e));
    await p.goto(URL + '?test=1&kv=1'); await p.waitForTimeout(1200);
    let s = await probe(p); F(s.kv && s.screen === 'hello' && s.scr === 1 && s.gears === 1, `${tag}: first visit is not one Kids Hello (screen ${s.screen}, ${s.scr} screens, ${s.gears} gears)`);
    let keep = null;
    if (song) {   // a song in progress: Old MacDonald, two steps in
      await p.evaluate(() => document.querySelector('#kv .kv-go').click()); await p.waitForTimeout(250);
      await p.evaluate(() => [...document.querySelectorAll('#kv .kv-card')].find(c => c.dataset.song === 'Kids Old MacDonald').click()); await p.waitForTimeout(250);
      for (let i = 0; i < 2; i++) { await p.evaluate(() => document.querySelector('#kv .kv-ctl .kv-next').click()); await p.waitForTimeout(200); }
      s = await probe(p); keep = { song: s.song, pos: s.pos }; F(s.song === 'Kids Old MacDonald' && s.pos === 2, `${tag}: setup song ${s.song} @${s.pos}`);
    }
    // boot in the start mode: switch there, then reload (the rd5 trigger)
    if (keep) keep.pos = null;
    if (start !== 'kids') { const m = await go(p, 'kids', start); F(!m, `${tag}: no ${m}`); await p.waitForTimeout(400); }
    await p.reload(); await p.waitForTimeout(1300);
    s = await probe(p); F(start === 'kids' ? s.kv : !s.kv && s[start], `${tag}: reload did not boot in ${start}`);
    if (start === 'kids') { F(s.screen === 'hello' && s.scr === 1, `${tag}: reload in Kids is not one Hello`);   // opening the app = Hello
      await p.evaluate(() => document.querySelector('#kv .kv-go').click()); await p.waitForTimeout(300); s = await probe(p);
      F(s.screen === (song ? 'play' : 'songs'), `${tag}: Hello start went to ${s.screen}`);
      if (song) { for (let k = 0; k < 2; k++) { await p.evaluate(() => document.querySelector('#kv .kv-ctl .kv-next').click()); await p.waitForTimeout(200); } keep.pos = (await probe(p)).pos; } }
    const i0 = PATH.indexOf(start); const path7 = PATH.slice(i0).concat(PATH.slice(1, i0 + 1));   // rotate so it starts at the start mode
    for (let i = 1; i < path7.length; i++) {
      const from = path7[i - 1], to = path7[i], st = `${tag} #${i} ${from}->${to}`;
      const m = await go(p, from, to); F(!m, `${st}: no ${m}`); await p.waitForTimeout(500); s = await probe(p); D.push({ st, s });
      if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `${w}x${h}-${start}-${song ? 'song' : 'nosong'}-${i}-${from}-${to}.png`) });
      if (to === 'kids') {
        F(s.kv && s.scr === 1, `${st}: ${s.scr} Kids screens visible (want 1)`);
        F(s.gears === 1, `${st}: ${s.gears} gears visible (want 1)`);
        F(s.screen !== 'hello', `${st}: a switch landed on Hello`);
        if (song) {
          F(s.screen === 'play', `${st}: kept song but landed on ${s.screen}`);
          F(s.song === keep.song && (keep.pos == null || s.pos === keep.pos), `${st}: song ${s.song} @${s.pos} (want ${keep.song} @${keep.pos})`);
          if (keep.pos == null && s.screen === 'play') {   // first Kids entry after the reload (a reload starts the song over): move 2 steps on, then every later switch keeps that step
            for (let k = 0; k < 2; k++) { await p.evaluate(() => document.querySelector('#kv .kv-ctl .kv-next').click()); await p.waitForTimeout(200); }
            keep.pos = (await probe(p)).pos; }
        } else F(s.screen === 'songs' && s.cards === 6, `${st}: no song but landed on ${s.screen} (${s.cards} cards)`);
        if (s.screen === 'play') {
          F(s.hello === 0, `${st}: Hello's disc / title / notes show on the play screen`);
          F(/MacDonald|Twinkle|Spider|Boat|Shoulders|Lamb/.test(s.chip), `${st}: song chip "${s.chip}"`);
          F(s.lyr.length > 3, `${st}: lyrics blank`); F(s.gold === 1, `${st}: ${s.gold} gold keys (want 1)`);
        }
      } else {
        F(!s.kv && s.scr === 0 && s.gears === 0, `${st}: Kids view still showing (${s.scr} screens, ${s.gears} gears)`);
        F(to === 'expert' ? s.expert && !s.simple : s.simple && !s.expert, `${st}: not in ${to} (expert ${s.expert}, simple ${s.simple})`);
      }
    }
    F(!errs.length, `${tag}: page errors ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  const name = process.argv[2] ? `modeswitch-${process.argv[2]}` : 'modeswitch';
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(R, null, 1));
  console.log(R.fails.length ? `FAIL ${R.fails.length}\n` + R.fails.slice(0, 40).join('\n') : `PASS (${Object.keys(R.data).length} scenarios, ${Object.values(R.data).reduce((a, x) => a + x.length, 0)} switches)`);
  process.exit(R.fails.length ? 1 : 0);
})();
