// Expert redesign (html.expert): decisions 1-11 at 360x780, 780x360, 820x1180 and 1180x820 (phone emulation via -r emulate.cjs:
// DPR 3, isMobile, hasTouch). Layout (nothing overlaps, keys docked C..B with 7 white keys, Sustain size and place, full 7x5 grid),
// Type bar toggle (table docks between grid and keys, grid stays fully visible, Sustain spans both table rows), hold a type + tap a
// key (maj7 + F = F A C E, release = normal), Song | Progressions (one at a time, pick unloads, Song re-selects), Style drop-down,
// Key sheet, Sound sheet stops above the keys, mode switch (rd6: the mode chip + shared sheet), a saved Full setup opens Expert.
// Writes OUT/expert.json. env BASE, OUT, X_SHOTS (screenshot dir, optional).
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const URL0 = process.env.URL || process.env.BASE || 'http://localhost:8080/index.html';
const OUT = process.env.OUT || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const SHOTS = process.env.X_SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const SIZES = process.argv[2] ? [process.argv[2].split('x').map(Number)] : [[360, 780], [780, 360], [820, 1180], [1180, 820]];
const SONG = fs.readFileSync(path.join(__dirname, '../fixtures/upload/expert-song.json'), 'utf8');
const R = { fails: [], passes: 0, data: {} }; let tag = '', D0 = null;
const F = (c, m) => { if (c) R.passes++; else R.fails.push(tag + ': ' + m); };
const SUS = { '360x780': [108, 52], '820x1180': [230, 72], '1180x820': [206, 84] };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  for (const [w, h] of (process.env.X_ONLY_STYLELIST ? [] : SIZES)) {
    tag = `${w}x${h}`; const land = w > h; const D = R.data[tag] = {};
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:{style:'pop',simple:false,playAlong:true,paHints:false,lockKey:{pc:0,mode:'major'}}}));}}catch(e){}`);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'test=1&hour=22&expert=1'); await p.waitForTimeout(1300);
    await p.evaluate(() => {
      const A = window.ChordAudio; window.__L = []; const pc = A.playChord.bind(A);
      A.playChord = function (g, m, o) { window.__L.push({ g, m: (m || []).slice().sort((a, b) => a - b) }); return pc(g, m, o); };
      window.__pd = (el, id, t) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(t || 'pointerdown', { pointerId: id, button: 0, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: id === 1, clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.75 })); };
      window.__r = s => { const e = typeof s === 'string' ? document.querySelector(s) : s; if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, vis: getComputedStyle(e).display !== 'none' && !e.closest('[hidden]') && r.width > 0 }; };
      window.__key = pc => [...document.querySelectorAll('#pads .pad')].find(k => +k.dataset.pc === pc);
    });
    const r = s => p.evaluate(s => window.__r(s), s);
    const shot = async n => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `${tag}-${n}.png`) }); };
    // 1. Expert on, Auto = Lamp at night, classic top bar / style row hidden
    const cls = await p.evaluate(() => document.documentElement.className);
    F(/\bexpert\b/.test(cls), 'html.expert on with ?expert=1'); F(/\bx-lamp\b/.test(cls), 'Auto look at night (hour 22) = Lamp (rd6: Auto is the default)');
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
    F(await p.evaluate(() => document.querySelectorAll('#xStyleMenu .x-mi').length === 8 && !document.getElementById('xStyleMenu').hidden), "'Pop' opens an 8-item style list");
    // rd4: no Kids in Expert's Style list (the Kids / Simple / Expert switch is the only way into Kids)
    F(await p.evaluate(() => !document.querySelector('#xStyleMenu [data-style="kids"]') && ![...document.querySelectorAll('#xStyleMenu .x-mi')].some(b => /kids/i.test(b.textContent))), 'Expert Style list has no Kids');
    F(await p.evaluate(() => !!document.querySelector('#styles button[data-style="kids"]')), 'the classic style chips keep Kids');
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
    // 12. decision 11 / rd6: one mode chip + the shared Settings sheet (Kids needs a 1 s hold)
    await p.click('#xModeChip'); await p.waitForTimeout(150); await shot('settings');
    F(await p.evaluate(() => !document.getElementById('modeSheet').hidden && document.querySelectorAll('#msMode button').length === 3 && document.querySelector('#msMode [data-mode=expert]').classList.contains('on')), 'Settings: Kids / Simple / Expert, Expert on');
    await p.click('#msMode [data-mode=simple]'); await p.waitForTimeout(400);
    F(await p.evaluate(() => document.documentElement.classList.contains('simple') && !document.documentElement.classList.contains('expert') && document.getElementById('modeSheet').hidden), 'Simple: the Simple screen, Expert off, sheet closed');
    await p.click('#modeChip'); await p.waitForTimeout(150);
    await p.click('#msMode [data-mode=kids]'); await p.waitForTimeout(400);
    F(await p.evaluate(() => document.querySelector('#styles .on').dataset.style === 'kids' && document.documentElement.classList.contains('kv') && !document.getElementById('kv').hidden && !document.documentElement.classList.contains('expert') && document.getElementById('modeSheet').hidden), 'Simple chip Kids: the Kids view (Kids style), sheet closed');
    { const c = await p.evaluate(() => { const e = [...document.querySelectorAll('#kv .mode-chip')].find(x => x.getClientRects().length); const q = e.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; });
      await p.mouse.move(c[0], c[1]); await p.mouse.down(); await p.waitForTimeout(1150); await p.mouse.up(); await p.waitForTimeout(200); }
    F(await p.evaluate(() => !document.getElementById('modeSheet').hidden && document.querySelector('#msMode [data-mode=kids]').classList.contains('on')), 'Kids chip (1 s hold): the same Kids / Simple / Expert switch, Kids on');
    await p.evaluate(() => document.querySelector('#msMode [data-mode=expert]').click()); await p.waitForTimeout(400);
    F(await p.evaluate(() => document.documentElement.classList.contains('expert') && !document.documentElement.classList.contains('kv') && document.querySelector('#styles .on').dataset.style === 'jazz'), 'Kids view Expert: back to Expert in the last style (Jazz), Kids view closed');
    F(await p.evaluate(() => JSON.parse(localStorage.getItem('touchChord.expert.v1')).on === true), 'Expert choice saved in its own store');
    // rd2 (Uiux #5): one mark per key - sounding = solid gold outline, next chord = teal dashed only on keys not sounding, no copper next-box
    const km = async () => p.evaluate(() => [...document.querySelectorAll('#pads .pad')].map(e => { const st = getComputedStyle(e), a = getComputedStyle(e, '::after');
      return { m: +e.dataset.midi, held: e.classList.contains('held'), nx: e.classList.contains('nx'), os: st.outlineStyle, oc: st.outlineColor, box: a.content !== 'none' && a.display !== 'none' && a.boxShadow !== 'none' }; }).filter(k => k.held || k.nx));
    let marks = await km(); D.keyMarksRest = marks;
    F(marks.some(k => k.nx) && marks.filter(k => k.nx && !k.held).every(k => k.os === 'dashed' && !k.box), 'at rest: next-chord keys teal dashed only (no copper box)');
    await p.evaluate(() => __progApi.next()); await p.waitForTimeout(120); marks = await km(); D.keyMarksPlay = marks;
    F(marks.some(k => k.held), 'Next: a chord sounds on the keys');
    F(marks.filter(k => k.held).every(k => k.os === 'solid' && k.oc === 'rgb(227, 154, 0)' && !k.box), 'sounding keys: one solid gold outline (no dashed, no copper box) ' + JSON.stringify(marks.filter(k => k.held)));
    F(marks.filter(k => k.nx && !k.held).every(k => k.os === 'dashed' && !k.box), 'next keys not sounding: teal dashed only');
    await p.evaluate(() => __progApi.stop && __progApi.stop()); await p.waitForTimeout(150);
    F(!errs.length, 'no page errors ' + errs.join(' | ')); D.errs = errs;
    await ctx.close();
    // 13. rd6: no classic Full screen any more: a saved Full setup opens Expert (12-key window, no classic top bar)
    const c2 = await b.newContext({ viewport: { width: w, height: h } });
    await c2.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:{style:'pop',simple:false}}));}}catch(e){}`);
    const p2 = await c2.newPage(); await p2.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'test=1&hour=22'); await p2.waitForTimeout(1200);
    const cl = await p2.evaluate(() => ({ expert: document.documentElement.classList.contains('expert'), keys: document.querySelectorAll('#pads .pad').length, top: getComputedStyle(document.querySelector('header.topbar')).display, xtop: getComputedStyle(document.getElementById('xTop')).display }));
    F(cl.expert && cl.keys === 12 && cl.top === 'none' && cl.xtop !== 'none', 'a saved Full setup opens Expert (12-key window, Expert top bar) ' + JSON.stringify(cl));
    await c2.close();
    // 15. rd4: a saved Expert setup with the Kids style loads as Pop in Expert (no crash), with and without ?expert=1
    for (const q of ['', 'expert=1']) {
      const c4 = await b.newContext({ viewport: { width: w, height: h } });
      await c4.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');localStorage.setItem('touchChord.expert.v1',JSON.stringify({on:true}));localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:{style:'kids',simple:false,playAlong:true,lockKey:{pc:0,mode:'major'}}}));}}catch(e){}`);
      const p4 = await c4.newPage(); const e4 = []; p4.on('pageerror', e => e4.push(e.message));
      await p4.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'test=1&hour=22' + (q ? '&' + q : '')); await p4.waitForTimeout(1300);
      const k4 = await p4.evaluate(() => ({ expert: document.documentElement.classList.contains('expert'), kv: document.documentElement.classList.contains('kv'), style: document.querySelector('#styles .on') && document.querySelector('#styles .on').dataset.style, label: document.querySelector('#xStyle .x-sl').textContent, keys: document.querySelectorAll('#pads .pad').length }));
      F(k4.expert && !k4.kv && k4.style === 'pop' && k4.label === 'Pop' && k4.keys === 12, `saved Expert + Kids style ${q || '(no ?expert)'} loads as Pop in Expert ${JSON.stringify(k4)}`);
      await p4.evaluate(() => __progApi.next()); await p4.waitForTimeout(300);
      F(!e4.length, `saved Expert + Kids style: no page errors ${e4.join(' | ')}`); await c4.close();
    }
    // 16. rd4 (Uiux rd3): the play-along hint covers no Expert block, chip, badge or key
    {
      const c5 = await b.newContext({ viewport: { width: w, height: h } });
      await c5.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:{style:'pop',simple:false,playAlong:true,paHints:true,lockKey:{pc:0,mode:'major'}}}));}}catch(e){}`);
      const p5 = await c5.newPage(); const e5 = []; p5.on('pageerror', e => e5.push(e.message));
      await p5.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'test=1&hour=22&expert=1'); await p5.waitForTimeout(1300);
      const hint = async () => p5.evaluate(() => { const hEl = document.getElementById('paHint'); if (hEl.hidden) return null; const H = hEl.getBoundingClientRect(), bad = [];
        const ov = r => r.width > 0 && r.height > 0 && H.left < r.right && r.left < H.right && H.top < r.bottom && r.top < H.bottom;
        document.querySelectorAll('#xTop, #xTog, #xGo, #xSrc, .now-card, #xCtl, .kb-wrap, #dev-badge, .pg-badge, #suggest .ss-chip, #suggest .ss-note, #pads .pad, .x-dots, #xSrc *').forEach(n => { if (getComputedStyle(n).display !== 'none' && ov(n.getBoundingClientRect())) bad.push((n.id || n.className || n.tagName) + ''); });
        const g = document.querySelector('.next-card').getBoundingClientRect(); const inG = H.left >= g.left + 4 && H.right <= g.right - 4 && H.top >= g.top + 4 && H.bottom <= g.bottom - 4; if (ov(g) && !inG) bad.push('grid border');
        return { text: hEl.textContent, r: [H.left, H.top, H.width, H.height].map(Math.round), bad, inView: H.left >= 0 && H.top >= 0 && H.right <= innerWidth && H.bottom <= innerHeight }; });
      const tap = async (sel, ms) => p5.evaluate(([sel, ms]) => new Promise(res => { const c = [...document.querySelectorAll(sel)].find(x => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden'); if (!c) return res(false); window.__pd(c, 7); setTimeout(() => { window.__pd(c, 7, 'pointerup'); res(true); }, ms); }), [sel, ms]);
      await p5.evaluate(() => { window.__pd = (el, id, t) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(t || 'pointerdown', { pointerId: id, button: 0, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); }; });
      // a wrong chip (G while C is next) -> "Tap the dot chord next"; a wrong key -> "Try the marked key next"
      await p5.evaluate(() => { const c = [...document.querySelectorAll('#suggest .ss-chip')].find(x => x.getClientRects().length && /^G(?=[ivxIVX]|$)/.test(x.textContent.trim())); window.__pd(c, 7); });
      await p5.waitForTimeout(350); const h1 = await hint(); D.hintChip = h1;
      F(h1 && h1.inView && !h1.bad.length, `hint after a wrong chip covers nothing ${JSON.stringify(h1)}`);
      if (SHOTS) await p5.screenshot({ path: path.join(SHOTS, `${tag}-hint.png`) });
      await p5.evaluate(() => { const c = [...document.querySelectorAll('#suggest .ss-chip')].find(x => x.getClientRects().length && /^G(?=[ivxIVX]|$)/.test(x.textContent.trim())); window.__pd(c, 7, 'pointerup'); });
      F(!e5.length, `hint: no page errors ${e5.join(' | ')}`); await c5.close();
    }
    // 14. rd3 (Noff rd2 MED + steering a/b): the 7-white-key window marks every pitch class of the sounding chord (gold) and of
    // the next chord (teal) - a note outside the window lights its same-name key with a small up / down arrow - across the 8
    // styles (Next steps, held chips, Play song); and every key's label is the note name of the pitch it plays (window start,
    // after a chord, after snap-back, during playback).
    const c3 = await b.newContext({ viewport: { width: w, height: h } });
    await c3.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');localStorage.setItem('touchChord.settings.v1',JSON.stringify({v:1,settings:{style:'pop',simple:false,playAlong:true,paHints:false,lockKey:{pc:0,mode:'major'}}}));}}catch(e){}`);
    const p3 = await c3.newPage(); const errs3 = []; p3.on('pageerror', e => errs3.push(e.message));
    await p3.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'test=1&hour=22&expert=1'); await p3.waitForTimeout(1300);
    await p3.evaluate(() => {
      const A = window.ChordAudio; window.__L = []; const pc = A.playChord.bind(A);
      A.playChord = function (g, m, o) { window.__L.push({ g, m: (m || []).map(Number).filter(isFinite) }); return pc(g, m, o); };
      window.__pd = (el, id, t) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(t || 'pointerdown', { pointerId: id, button: 0, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); };
      const NM = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
      window.__chk = (sounding) => {   // sounding: the true notes (null = none); next from the app's own next-chord rule
        const pc = m => ((m % 12) + 12) % 12, out = [];
        const keys = [...document.querySelectorAll('#pads .pad')].map(e => { const nm = (e.querySelector('.nm') || e).textContent.trim(); const a = getComputedStyle(e, '::after');
          return { m: +e.dataset.midi, dpc: +e.dataset.pc, nm, c: e.classList, arrow: a.display !== 'none' && /[\u2191\u2193]/.test(a.content) ? (a.content.includes('\u2191') ? 'up' : 'down') : null }; });
        const lab = []; keys.forEach(k => { const t = k.nm.replace(/[♯#]/, '+').replace(/[♭]/, '-'); const v = NM[t[0]]; const lp = v == null ? null : pc(v + (t.includes('+') ? 1 : 0) - (t.includes('-') ? 1 : 0));
          if (lp !== pc(k.m) || k.dpc !== pc(k.m)) lab.push(`${k.m} labelled ${k.nm} (data-pc ${k.dpc})`); });
        const lo = Math.min(...keys.map(k => k.m)), hi = Math.max(...keys.map(k => k.m)), byPc = {}; keys.forEach(k => byPc[pc(k.m)] = k);
        const gold = k => k.c.contains('held') || k.c.contains('selected') || k.c.contains('x-pclit');
        const teal = k => k.c.contains('nx') || k.c.contains('x-pcnx');
        const want = (list, kind) => { const pcs = [...new Set(list.map(pc))];
          pcs.forEach(q => { const k = byPc[q]; if (!k) { out.push(`${kind} pc ${q} has no key`); return; }
            const ok = kind === 'gold' ? gold(k) : (gold(k) || teal(k)); if (!ok) { out.push(`${kind} ${q} (${list.filter(m => pc(m) === q)}) unmarked on ${k.m}`); return; }
            if (kind === 'teal' && gold(k)) return;   // the same key already sounds: gold wins
            const inWin = list.some(m => pc(m) === q && m >= lo && m <= hi); const dir = list.some(m => pc(m) === q && m > hi) ? 'up' : 'down';
            if (!inWin && k.arrow !== dir) out.push(`${kind} ${q} only outside ${lo}..${hi} (${list.filter(m => pc(m) === q)}): key ${k.m} arrow ${k.arrow}, want ${dir}`);
            if (inWin && k.arrow && !list.some(m => m < lo || m > hi)) out.push(`${kind} ${q}: arrow ${k.arrow} on an in-window note`); }); };
        const snd = sounding || []; want(snd, 'gold'); const nx = window.__xMarks ? window.__xMarks.next() : []; want(nx, 'teal');
        if (!snd.length) keys.forEach(k => { if (k.c.contains('x-pclit')) out.push(`nothing sounds but ${k.m} is gold`); });
        return { lab, out, lo, snd, nx };
      };
    });
    const STY = ['pop', 'jazz', 'rnb', 'ballad', 'reggae', 'funk', 'yogaDeep', 'country'];
    const lastChord = () => p3.evaluate(() => { const l = window.__L.filter(x => x.m.length > 1); window.__L = []; return l.length ? l[l.length - 1].m : null; });
    const chk = async (what, snd) => { await p3.waitForTimeout(60); const r = await p3.evaluate(s => window.__chk(s), snd);
      F(!r.lab.length, `${what}: key labels match the pitches (window ${r.lo}) ${r.lab.join('; ')}`);
      F(!r.out.length, `${what}: every pitch class of the sounding ${JSON.stringify(r.snd)} and next ${JSON.stringify(r.nx)} chords is marked: ${r.out.join('; ')}`); return r; };
    D.marks = {};
    for (const sty of STY) {
      await p3.evaluate(() => { const b = document.getElementById('xStyle'); b.click(); }); await p3.waitForTimeout(120);
      await p3.evaluate(s => document.querySelector(`#xStyleMenu [data-style="${s}"]`).click(), sty); await p3.waitForTimeout(400);
      F(await p3.evaluate(s => document.querySelector('#styles .on').dataset.style === s, sty), `style ${sty} picked`);
      await p3.evaluate(() => { __progApi.stop && __progApi.stop(); window.__L = []; }); await p3.waitForTimeout(150);
      const st = D.marks[sty] = [];
      st.push(await chk(`${sty} rest`, null));
      for (let i = 0; i < 4; i++) { await p3.evaluate(() => __progApi.next()); await p3.waitForTimeout(220); const m = await lastChord(); F(!!m, `${sty} Next ${i + 1} sounds`); st.push(await chk(`${sty} Next ${i + 1}`, m)); }
      const nch = await p3.evaluate(() => [...document.querySelectorAll('#suggest .ss-chip')].filter(x => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden').length);
      for (let i = 0; i < Math.min(nch, 7); i++) {
        await p3.evaluate(i => { window.__L = []; const c = [...document.querySelectorAll('#suggest .ss-chip')].filter(x => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden')[i]; window.__chip = c; window.__pd(c, 80 + i); }, i);
        await p3.waitForTimeout(260); const m = await lastChord(); const nm = await p3.evaluate(() => window.__chip.textContent.trim());
        st.push(await chk(`${sty} hold chip ${nm}`, m));
        await p3.evaluate(i => window.__pd(window.__chip, 80 + i, 'pointerup'), i); await p3.waitForTimeout(200);
      }
      if (sty === 'pop' || sty === 'jazz') { await p3.waitForTimeout(3600); st.push(await chk(`${sty} after snap-back`, null)); }
      await p3.evaluate(() => { const i = __prog.list.findIndex(x => x.style === undefined || true); __progApi.play(); }); 
      for (let k = 0; k < 3; k++) { await p3.waitForTimeout(900); const snd = await p3.evaluate(() => window.__xMarks ? window.__xMarks.sounding() : []); st.push(await chk(`${sty} Play song ${k + 1}`, snd.length ? snd : null)); }
      await p3.evaluate(() => __progApi.stop()); await p3.waitForTimeout(300);
    }
    if (SHOTS) { await p3.evaluate(() => { const b = document.getElementById('xStyle'); b.click(); }); await p3.waitForTimeout(100); await p3.evaluate(() => document.querySelector('#xStyleMenu [data-style="pop"]').click()); await p3.waitForTimeout(400);
      const g = await p3.evaluate(() => { const c = [...document.querySelectorAll('#suggest .ss-chip')].find(x => /^G\b/.test(x.textContent.trim()) && x.getClientRects().length); if (c) { window.__chip = c; window.__pd(c, 99); } return !!c; });
      if (g) { await p3.waitForTimeout(300); await p3.screenshot({ path: path.join(SHOTS, `${tag}-holdG.png`) }); await p3.evaluate(() => window.__pd(window.__chip, 99, 'pointerup')); } }
    F(!errs3.length, 'marks: no page errors ' + errs3.join(' | ')); await c3.close();
    console.log(`${tag}: ${R.fails.filter(f => f.startsWith(tag)).length} fails`);
  }
  // rd5 (Uiux, landscape phone): the open Style list shows every row that fits; if it still scrolls, the last visible row is
  // cut part way (and fades) and the list scrolls to the 8th. Portrait / iPad: all 8 rows fully visible.
  for (const [w, h] of (process.argv[2] ? SIZES.concat([[844, 390]]) : [[780, 360], [844, 390], [390, 844], [360, 780], [820, 1180], [1180, 820]])) {
    tag = `${w}x${h} style list`; const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(`try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.clear();localStorage.setItem('touchChord.tour.v1','done');}}catch(e){}`);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'test=1&hour=22&expert=1'); await p.waitForTimeout(1300);
    await p.click('#xStyle'); await p.waitForTimeout(300);
    const look = () => p.evaluate(() => { const m = document.getElementById('xStyleMenu'), M = m.getBoundingClientRect(), cs = getComputedStyle(m);
      const iT = M.top + parseFloat(cs.borderTopWidth), iB = M.bottom - parseFloat(cs.borderBottomWidth);
      return { top: M.top, bottom: M.bottom, vh: innerHeight, sh: m.scrollHeight, ch: m.clientHeight, st: m.scrollTop, more: m.classList.contains('x-more'),
        rows: [...m.querySelectorAll('.x-mi')].map(b => { const q = b.getBoundingClientRect(); return { s: b.dataset.style, h: q.height, vis: Math.max(0, Math.min(q.bottom, iB) - Math.max(q.top, iT)) }; }) }; });
    const L = await look(); D0 = R.data[tag] = { open: L };
    F(L.rows.length === 8, `8 styles in the list (${L.rows.length})`);
    F(L.bottom <= L.vh - 4, `the list stays on screen with a margin (bottom ${L.bottom} of ${L.vh})`);
    const full = L.rows.filter(r => r.vis >= r.h - 0.5).length, cut = L.rows.filter(r => r.vis > 0.5 && r.vis < r.h - 0.5);
    if (full === 8) F(!L.more, 'all 8 rows fully visible, no fade');
    else {
      F(w > h && h <= 500, `only a landscape phone may scroll the list (${full}/8 rows fully visible)`);
      F(full >= 5, `the list grows into the space below: ${full} full rows (rd4: 4)`);
      F(cut.length === 1 && L.rows.indexOf(cut[0]) === full && cut[0].vis >= cut[0].h * 0.3 && cut[0].vis <= cut[0].h * 0.7, `the last visible row is cut about in half ${JSON.stringify(cut)}`);
      F(L.more && L.sh > L.ch, 'the list scrolls and shows the bottom fade');
      await p.evaluate(() => { const m = document.getElementById('xStyleMenu'); m.scrollTop = m.scrollHeight; }); await p.waitForTimeout(200);
      const L2 = await look(); D0.end = L2; const last = L2.rows[7];
      F(last.s === 'country' && last.vis >= last.h - 0.5, `scrolled to the end: the 8th row (Country) fully visible ${JSON.stringify(last)}`);
      F(!L2.more, 'no fade at the end of the list');
      await p.click('#xStyleMenu [data-style="country"]'); await p.waitForTimeout(300);
      F(await p.evaluate(() => document.querySelector('#styles .on').dataset.style === 'country'), 'the 8th style can be picked');
    }
    F(!errs.length, 'no page errors ' + errs.join(' | ')); await ctx.close();
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'expert.json'), JSON.stringify(R, null, 1));
  console.log(`expert: ${R.passes} checks passed, ${R.fails.length} fails`); R.fails.slice(0, 60).forEach(f => console.log('  ' + f));
})().catch(e => { console.error('Error', e); process.exit(1); });
