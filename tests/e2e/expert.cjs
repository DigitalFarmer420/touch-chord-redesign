// Expert redesign (html.expert): decisions 1-11 at 360x780, 780x360, 820x1180 and 1180x820 (phone emulation via -r emulate.cjs:
// DPR 3, isMobile, hasTouch). Layout (nothing overlaps, keys docked C..B with 7 white keys, Sustain size and place, full 7x5 grid),
// Type bar toggle (table docks between grid and keys, grid stays fully visible, Sustain spans both table rows), hold a type + tap a
// key (maj7 + F = F A C E, release = normal), Song | Progressions (one at a time, pick unloads, Song re-selects), Style drop-down,
// Key sheet, Sound sheet stops above the keys, mode switch (Kids / Simple / Expert), classic Full untouched without Expert.
// Writes OUT/expert.json. env BASE, OUT, X_SHOTS (screenshot dir, optional).
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const URL0 = process.env.URL || process.env.BASE || 'http://localhost:8080/index.html';
const OUT = process.env.OUT || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const SHOTS = process.env.X_SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const SIZES = process.argv[2] ? [process.argv[2].split('x').map(Number)] : [[360, 780], [780, 360], [820, 1180], [1180, 820]];
const SONG = fs.readFileSync(path.join(__dirname, '../fixtures/upload/expert-song.json'), 'utf8');
const R = { fails: [], passes: 0, data: {} }; let tag = '';
const F = (c, m) => { if (c) R.passes++; else R.fails.push(tag + ': ' + m); };
const SUS = { '360x780': [108, 52], '820x1180': [230, 72], '1180x820': [206, 84] };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  for (const [w, h] of SIZES) {
    tag = `${w}x${h}`; const land = w > h; const D = R.data[tag] = {};
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:{style:'pop',simple:false,playAlong:true,paHints:false,lockKey:{pc:0,mode:'major'}}}));}}catch(e){}`);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'test=1&expert=1'); await p.waitForTimeout(1300);
    await p.evaluate(() => {
      const A = window.ChordAudio; window.__L = []; const pc = A.playChord.bind(A);
      A.playChord = function (g, m, o) { window.__L.push({ g, m: (m || []).slice().sort((a, b) => a - b) }); return pc(g, m, o); };
      window.__pd = (el, id, t) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(t || 'pointerdown', { pointerId: id, button: 0, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: id === 1, clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.75 })); };
      window.__r = s => { const e = typeof s === 'string' ? document.querySelector(s) : s; if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, vis: getComputedStyle(e).display !== 'none' && !e.closest('[hidden]') && r.width > 0 }; };
      window.__key = pc => [...document.querySelectorAll('#pads .pad')].find(k => +k.dataset.pc === pc);
    });
    const r = s => p.evaluate(s => window.__r(s), s);
    const shot = async n => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `${tag}-${n}.png`) }); };
    // 1. Expert on, Lamplight, classic top bar / style row hidden
    const cls = await p.evaluate(() => document.documentElement.className);
    F(/\bexpert\b/.test(cls), 'html.expert on with ?expert=1'); F(/\bx-lamp\b/.test(cls), 'Lamplight is the default look (decision 1)');
    F(!(await r('header.topbar')).vis && !(await r('#styles')).vis, 'classic top bar and style chip row hidden (decision 6)');
    // 2. layout: blocks inside the viewport, no overlaps
    const ids = ['#xTop', '#xGo', '#xSrc', '.now-card', '.next-card', '#sustainBtn', '#xCtl', '.kb-wrap'];
    const rs = {}; for (const s of ids) rs[s] = await r(s); D.rects = rs;
    for (const s of ids) F(rs[s] && rs[s].vis && rs[s].l >= -0.5 && rs[s].t >= -0.5 && rs[s].r <= w + 0.5 && rs[s].b <= h + 0.5, `${s} visible inside the viewport ${JSON.stringify(rs[s])}`);
    const ov = (a, c) => a.l < c.r - 0.5 && c.l < a.r - 0.5 && a.t < c.b - 0.5 && c.t < a.b - 0.5;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) F(!ov(rs[ids[i]], rs[ids[j]]), `${ids[i]} and ${ids[j]} do not overlap`);
    F(rs['.kb-wrap'].t >= rs['.next-card'].b && rs['.kb-wrap'].t >= rs['#xCtl'].b - 0.5, 'keys docked under the grid and the control row');
    // 3. decision 10: C..B, 7 white keys, root lowest / rising left to right
    const keys = await p.evaluate(() => [...document.querySelectorAll('#pads .pad')].map(k => ({ m: +k.dataset.midi, white: k.classList.contains('white'), l: k.getBoundingClientRect().left })));
    const wh = keys.filter(k => k.white); D.keys = keys.map(k => k.m);
    F(wh.length === 7 && keys.length === 12, `7 white keys / 12 keys (got ${wh.length} / ${keys.length})`);
    F(JSON.stringify(wh.map(k => k.m)) === '[60,62,64,65,67,69,71]', `at rest in C major the keys are C..B ${wh.map(k => k.m)}`);
    F(wh.every((k, i) => !i || (k.m > wh[i - 1].m && k.l > wh[i - 1].l)), 'pitch rises left to right');
    // 4. decision 7 / 5: the full grid (7 notes + chips), black border
    const grid = await p.evaluate(() => { const c = document.querySelector('.next-card').getBoundingClientRect(); const els = [...document.querySelectorAll('#suggest .ss-note, #suggest .ss-chip')];
      return { notes: document.querySelectorAll('#suggest .ss-note').length, chips: document.querySelectorAll('#suggest .ss-chip').length, inside: els.every(e => { const r = e.getBoundingClientRect(); return r.width > 10 && r.height > 10 && r.left >= c.left - 1 && r.right <= c.right + 1 && r.top >= c.top - 1 && r.bottom <= c.bottom + 1; }),
        minH: Math.min(...els.map(e => e.getBoundingClientRect().height)), border: getComputedStyle(document.querySelector('.next-card')).borderTopColor }; });
    D.grid = grid;
    F(grid.notes === 7 && grid.chips >= 7, `7 notes + chord chips (${grid.notes} / ${grid.chips})`); F(grid.inside, 'every grid chip inside the grid box');
    F(grid.border === 'rgb(0, 0, 0)', 'black border on the chord grid (decision 5) ' + grid.border);
    // 5. decision 3: Sustain size, far left, row order Sustain, Type, Full Range, Sound
    const sus = rs['#sustainBtn'], ty = await r('#xType'), fr = await r('#xFull'), so = await r('#xSound'); D.sus = sus;
    if (SUS[tag]) F(Math.abs(sus.w - SUS[tag][0]) <= 3 && Math.abs(sus.h - SUS[tag][1]) <= 3, `Sustain ${Math.round(sus.w)}x${Math.round(sus.h)} = ${SUS[tag]}`);
    else F(sus.w >= 108 && sus.h >= 44, `Sustain at least 108x44 (${Math.round(sus.w)}x${Math.round(sus.h)})`);
    if (!land) F(sus.l < ty.l && ty.l < fr.l && fr.l < so.l && sus.l <= 20, 'row order [Sustain][Type][Full Range][Sound], Sustain far left');
    else F(sus.b <= ty.t + 0.5 && ty.b <= fr.t + 0.5 && fr.l < so.l, 'landscape column: Sustain first, then Type, then Full Range / Sound');
    await shot('play');
    // 6. decision 2 + 4: Type bar toggle, docked table, grid fully visible, Sustain spans both table rows
    F(!(await r('#chords')).vis, 'table folded at start');
    await p.click('#xType'); await p.waitForTimeout(250);
    const pal = await r('#palette'), card = await r('.next-card'), kb = await r('.kb-wrap'), sus2 = await r('#sustainBtn');
    const btn = await p.evaluate(() => [...document.querySelectorAll('#palette button')].map(e => { const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; }));
    F(await p.evaluate(() => document.documentElement.classList.contains('x-types-open')) && pal.vis, 'one tap on the Type bar opens the table');
    F(btn.length === 8 && new Set(btn.map(x => Math.round(x.t))).size === 2, '4x2 table (8 buttons on 2 rows)');
    F(!ov(pal, card) && pal.b <= kb.t + 0.5, 'table docks between the grid and the keys (no overlap)');
    F(land ? pal.t >= card.t - 0.5 : pal.t >= card.b - 0.5, 'table under the grid' + (land ? ' (landscape: beside it, in the right column)' : ''));
    const g2 = await p.evaluate(() => { const c = document.querySelector('.next-card').getBoundingClientRect(); return [...document.querySelectorAll('#suggest .ss-note, #suggest .ss-chip')].every(e => { const r = e.getBoundingClientRect(); return r.height > 10 && r.top >= c.top - 1 && r.bottom <= c.bottom + 1 && r.bottom <= innerHeight; }); });
    F(g2, 'the full grid stays visible with the table open');
    const rowsT = Math.min(...btn.map(x => x.t)), rowsB = Math.max(...btn.map(x => x.b));
    F(sus2.t <= rowsT + 1 && sus2.b >= rowsB - 1 && (sus2.r <= Math.min(...btn.map(x => x.l)) + 0.5), `Sustain spans both table rows beside it (decision 4) sus ${Math.round(sus2.t)}-${Math.round(sus2.b)} rows ${Math.round(rowsT)}-${Math.round(rowsB)}`);
    F((await r('.kb-wrap')).h >= (land ? 100 : 180), 'keys keep a playable height with the table open');
    await shot('types');
    // 7. decision 9: hold maj7, tap F -> Fmaj7; release -> normal
    const held = await p.evaluate(async () => {
      window.__L.length = 0; __pd(document.querySelector('#palette [data-ext=maj7]'), 21); await new Promise(r => setTimeout(r, 60));
      const f = __key(5); __pd(f, 22); await new Promise(r => setTimeout(r, 60));
      const o = { played: window.__L.map(x => x.m), now: document.getElementById('symbol').textContent, label: document.querySelector('#xType .x-tv').textContent,
        heldTag: document.querySelector('#palette [data-ext=maj7]').classList.contains('x-held'), lit: [...document.querySelectorAll('#pads .pad.held, #pads .pad.x-pclit')].map(k => +k.dataset.pc).sort((a, b) => a - b) };
      __pd(f, 22, 'pointerup'); __pd(document.querySelector('#palette [data-ext=maj7]'), 21, 'pointerup'); await new Promise(r => setTimeout(r, 80));
      o.labelAfter = document.querySelector('#xType .x-tv').textContent; window.__L.length = 0;
      __pd(__key(5), 23); await new Promise(r => setTimeout(r, 60)); o.after = window.__L.map(x => x.m); __pd(__key(5), 23, 'pointerup');
      return o; });
    D.held = held;
    F(held.played.length === 1 && JSON.stringify(held.played[0]) === '[65,69,72,76]', 'hold maj7 + tap F plays F A C E ' + JSON.stringify(held.played));
    F(held.now === 'Fmaj7', 'NOW reads Fmaj7 (' + held.now + ')'); F(held.label === 'maj7' && held.heldTag, 'Type bar reads maj7, the chip shows HELD');
    F(JSON.stringify(held.lit) === '[0,4,5,9]', 'F A C E light on the keys (pitch classes) ' + held.lit);
    F(held.labelAfter === 'Auto' && JSON.stringify(held.after[0]) === '[65,69,72]', 'let go: F plays F major again ' + JSON.stringify(held.after));
    await p.click('#xType'); await p.waitForTimeout(200);
    F(!(await p.evaluate(() => document.documentElement.classList.contains('x-types-open'))) && !(await r('#chords')).vis, 'the next tap folds the table');
    // 8. decision 8: Song | Progressions, one at a time
    F(await p.evaluate(() => document.querySelector('#xTog [data-v=prog]').classList.contains('on') && !!document.querySelector('#xSrc .x-pbar')), 'no song: Progressions view with the slim bar');
    await p.evaluate(s => { window.__upload.load(s); document.getElementById('uploadPick').hidden = true; }, SONG); await p.waitForTimeout(300);
    let sv = await p.evaluate(() => ({ song: document.querySelector('#xTog [data-v=song]').classList.contains('on'), title: (document.querySelector('#xSrc .x-stitle') || {}).textContent, bar: !!document.querySelector('#xSrc .x-pbar'), sel: window.__upload.song() && window.__upload.song().selected }));
    F(sv.song && /Amazing Grace/.test(sv.title || '') && !sv.bar, 'a loaded song switches to Song view (title shown, no progression bar) ' + JSON.stringify(sv));
    await p.click('#xNext'); await p.waitForTimeout(200);
    F(await p.evaluate(() => !!document.querySelector('#xSrc .x-sline .x-now')), 'the current lyric word is on gold');
    await shot('song');
    await p.click('#xTog [data-v=prog]'); await p.waitForTimeout(200);
    sv = await p.evaluate(() => ({ list: !document.getElementById('xPList').hidden, rows: document.querySelectorAll('#xPList .x-prow').length, songStill: window.__upload.song().selected !== false && !!document.querySelector('#xTog [data-v=prog].on'), songPane: !!document.querySelector('#xSrc .x-songc') }));
    F(sv.list && sv.rows >= 3 && !sv.songPane, 'Progressions opens the list, the song pane is replaced ' + JSON.stringify(sv));
    const plist = await r('#xPList'); F(plist.b <= (await r('.kb-wrap')).t + 0.5, 'the list never covers the keys');
    await shot('proglist');
    await p.click('#xPList .x-prow'); await p.waitForTimeout(250);
    sv = await p.evaluate(() => ({ list: !document.getElementById('xPList').hidden, sel: window.__prog.list[window.__prog.idx].up, bar: !!document.querySelector('#xSrc .x-pbar') }));
    F(!sv.list && !sv.sel && sv.bar, 'a pick unloads the song, folds the list to the slim bar ' + JSON.stringify(sv));
    await p.click('#xTog [data-v=song]'); await p.waitForTimeout(250);
    sv = await p.evaluate(() => ({ sel: !!window.__prog.list[window.__prog.idx].up, song: !!document.querySelector('#xSrc .x-songc'), bar: !!document.querySelector('#xSrc .x-pbar') }));
    F(sv.sel && sv.song && !sv.bar, 'Song re-selects the loaded song ' + JSON.stringify(sv));
    await p.click('#xTog [data-v=song]'); await p.waitForTimeout(250);
    F(await p.evaluate(() => !document.getElementById('uploadPick').hidden), 'tapping the active Song tab opens My songs / Upload');
    await p.evaluate(() => { document.getElementById('uploadPick').hidden = true; });
    // 9. decision 6: Style drop-down
    await p.click('#xStyle'); await p.waitForTimeout(150);
    F(await p.evaluate(() => document.querySelectorAll('#xStyleMenu .x-mi').length === 9 && !document.getElementById('xStyleMenu').hidden), "'Pop' opens a 9-item style list");
    await shot('style');
    await p.click('#xStyleMenu [data-style=jazz]'); await p.waitForTimeout(250);
    F(await p.evaluate(() => document.querySelector('#styles .on').dataset.style === 'jazz' && document.querySelector('#xStyle .x-sl').textContent === 'Jazz' && document.getElementById('xStyleMenu').hidden), 'picking Jazz sets the style and folds the list');
    // 10. Key sheet
    await p.click('#xKey'); await p.waitForTimeout(150); await shot('key');
    await p.click('#xKeySheet .x-mk[data-pc="7"]'); await p.click('#xKeySheet [data-km=minor]'); await p.waitForTimeout(200);
    F(await p.evaluate(() => document.querySelector('#xKey .x-kl').textContent === 'G minor'), 'key sheet: G + Minor = G minor');
    await p.click('#xKeySheet .x-close'); await p.waitForTimeout(150);
    // 11. Sound sheet stops above the keys, keys unchanged
    const kb0 = await r('.kb-wrap'); await p.click('#xSound'); await p.waitForTimeout(250);
    const ctl = await r('#ctl'), kb1 = await r('.kb-wrap');
    F(ctl.vis && ctl.b <= kb1.t + 0.5 && JSON.stringify(kb0) === JSON.stringify(kb1), 'Sound sheet opens above the keys; the keys keep their size');
    await shot('sound');
    await p.evaluate(() => document.getElementById('xScrim').click()); await p.waitForTimeout(150);
    // 12. decision 11: mode switch
    await p.click('#xBadge'); await p.waitForTimeout(150); await shot('settings');
    F(await p.evaluate(() => document.querySelectorAll('#xSettings .x-mode button').length === 3 && document.querySelector('#xSettings .x-mode [data-mode=expert]').classList.contains('on')), 'Settings: Kids / Simple / Expert, Expert on');
    await p.click('#xSettings .x-mode [data-mode=simple]'); await p.waitForTimeout(400);
    F(await p.evaluate(() => document.documentElement.classList.contains('simple') && !document.documentElement.classList.contains('expert')), 'Simple: the Simple screen, Expert off');
    await p.evaluate(() => { document.getElementById('configBtn').click(); }); await p.waitForTimeout(100);
    await p.evaluate(() => document.querySelector('.x-gearmode [data-mode=kids]').click()); await p.waitForTimeout(400);
    F(await p.evaluate(() => document.querySelector('#styles .on').dataset.style === 'kids' && !document.documentElement.classList.contains('expert') && !document.documentElement.classList.contains('simple')), 'gear menu Kids: Kids style');
    await p.evaluate(() => document.querySelector('.x-gearmode [data-mode=expert]').click()); await p.waitForTimeout(400);
    F(await p.evaluate(() => document.documentElement.classList.contains('expert') && document.querySelector('#styles .on').dataset.style === 'jazz'), 'gear menu Expert: back to Expert in the last style (Jazz)');
    F(await p.evaluate(() => JSON.parse(localStorage.getItem('touchChord.expert.v1')).on === true), 'Expert choice saved in its own store');
    F(!errs.length, 'no page errors ' + errs.join(' | ')); D.errs = errs;
    await ctx.close();
    // 13. classic Full untouched without Expert
    const c2 = await b.newContext({ viewport: { width: w, height: h } });
    await c2.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:{style:'pop',simple:false}}));}}catch(e){}`);
    const p2 = await c2.newPage(); await p2.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'test=1'); await p2.waitForTimeout(1200);
    const cl = await p2.evaluate(() => ({ expert: document.documentElement.classList.contains('expert'), keys: document.querySelectorAll('#pads .pad').length, top: getComputedStyle(document.querySelector('header.topbar')).display, xtop: getComputedStyle(document.getElementById('xTop')).display }));
    F(!cl.expert && cl.keys === 13 && cl.top !== 'none' && cl.xtop === 'none', 'without Expert: the classic Full screen (13-key window, classic top bar) ' + JSON.stringify(cl));
    await c2.close();
    console.log(`${tag}: ${R.fails.filter(f => f.startsWith(tag)).length} fails`);
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'expert.json'), JSON.stringify(R, null, 1));
  console.log(`expert: ${R.passes} checks passed, ${R.fails.length} fails`); R.fails.slice(0, 60).forEach(f => console.log('  ' + f));
})().catch(e => { console.error('Error', e); process.exit(1); });
