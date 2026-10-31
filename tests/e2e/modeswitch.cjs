// rd5.1: every mode switch leaves exactly one screen. rd5 bug: a page that loaded (or reloaded) in Expert or Simple and
// then switched to Kids showed Hello, Songs and Play stacked (3 gears, Hello's big play disc behind the pads, blank song
// chip and lyrics, no gold key). For each start mode (Kids / Expert / Simple, entered and then RELOADED so the page boots
// in it), with and without a Kids song in progress, walk every ordered pair of modes (K->E, E->S, S->K, K->S, S->E, E->K)
// and after every switch assert:
//  - in Kids: exactly one visible Kids screen and one visible gear; never Hello on a switch (Hello is only for opening the
//    app); a kept song lands on its play screen with the same song and step, the chip and lyrics filled and exactly one
//    gold key, Hello's disc / title / notes hidden; no song = the song list (six cards);
//  - in Expert / Simple: #kv hidden, no Kids screen or gear visible, html.expert / html.simple as asked.
// rd6: the switch is the mode chip (top right) + the shared Settings sheet in every mode; in Kids the chip needs a 1 s
// press-and-hold (a real touch held 1.15 s). After every switch: exactly one mode chip visible, labelled with the mode, and
// none of the old controls (Kids gear, Simple toggle, gear menu, gold Expert button); the sheet is closed. The Kids step
// survives the reload in Expert / Simple (rd6, Noff Low): the first Kids entry after it resumes at the saved step.
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
    scr: n('#kv .kv-scr'), gears: n('#kv .mode-chip'), chips: [...document.querySelectorAll('.mode-chip')].filter(v).map(e => e.dataset.modeChip + ':' + e.textContent.trim()),
    old: n('.kv-gear, #simpleBtn, #configBtn, #xBadge, .x-gearmode, #kvSettings'), sheet: !document.getElementById('modeSheet').hidden, hello: n('#kv .kv-go, #kv .kv-title, #kv .kv-notes'), cards: n('#kv .kv-card'),
    chip: kv.querySelector('.kv-chip').textContent.trim(), lyr: kv.querySelector('.kv-lyr').textContent.trim(), gold: n('#kv .kv-wk.gold, #kv .kv-bk.gold'),
    song: __prog.list[__prog.idx] && __prog.list[__prog.idx].name, cur: __prog.cur, pos: __magic.state.pos };
});
// rd6: the real switch of each mode: its mode chip (Kids: a 1.15 s touch hold), then the mode in the shared sheet
const go = async (p, from, to) => {
  const c = await p.evaluate(() => { const e = [...document.querySelectorAll('.mode-chip')].find(x => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden'); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2, m: e.dataset.modeChip }; });
  if (!c) return 'visible mode chip'; if (c.m !== from) return `chip ${c.m} in ${from}`;
  const cdp = p.__cdp || (p.__cdp = await p.context().newCDPSession(p));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] }); await p.waitForTimeout(from === 'kids' ? 1150 : 80);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(200);
  const r = await p.evaluate(to => { if (document.getElementById('modeSheet').hidden) return 'sheet did not open'; const b = document.querySelector(`#msMode button[data-mode="${to}"]`); if (!b) return 'no ' + to; const q = b.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; }, to);
  if (typeof r === 'string') return r;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] }); await p.waitForTimeout(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return null;
};
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h] of SIZES) for (const start of ['kids', 'expert', 'simple']) for (const song of [true, false]) {
    const tag = `${w}x${h} ${start} ${song ? 'song' : 'nosong'}`; const D = R.data[tag] = [];
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');}}catch(e){}`);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e));
    await p.goto(URL + '?test=1&kv=1&hour=12'); await p.waitForTimeout(1200);
    let s = await probe(p); F(s.kv && s.screen === 'hello' && s.scr === 1 && s.gears === 1, `${tag}: first visit is not one Kids Hello (screen ${s.screen}, ${s.scr} screens, ${s.gears} gears)`);
    let keep = null;
    if (song) {   // a song in progress: Old MacDonald, two steps in
      await p.evaluate(() => document.querySelector('#kv .kv-go').click()); await p.waitForTimeout(250);
      await p.evaluate(() => [...document.querySelectorAll('#kv .kv-card')].find(c => c.dataset.song === 'Kids Old MacDonald').click()); await p.waitForTimeout(250);
      for (let i = 0; i < 2; i++) { await p.evaluate(() => document.querySelector('#kv .kv-ctl .kv-next').click()); await p.waitForTimeout(200); }
      s = await probe(p); keep = { song: s.song, pos: s.pos }; F(s.song === 'Kids Old MacDonald' && s.pos === 2, `${tag}: setup song ${s.song} @${s.pos}`);
    }
    // boot in the start mode: switch there, then reload (the rd5 trigger)
    // rd6: the step is saved with the song, so it survives the reload below (rd5.1: the reload started the song over)
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
      F(s.chips.length === 1 && s.chips[0].startsWith(to + ':') && s.chips[0].toLowerCase().includes(to), `${st}: mode chips ${JSON.stringify(s.chips)} (want one ${to})`);
      F(s.old === 0, `${st}: ${s.old} old mode controls visible`); F(!s.sheet, `${st}: the sheet stayed open`);
      if (to === 'kids') {
        F(s.kv && s.scr === 1, `${st}: ${s.scr} Kids screens visible (want 1)`);
        F(s.gears === 1, `${st}: ${s.gears} Kids chips visible (want 1)`);
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
