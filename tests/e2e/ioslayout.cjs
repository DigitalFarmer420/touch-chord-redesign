// Phone and tablet layout matrix for Kids, Simple and Expert.
// CSS viewports, each also reversed: 375x667, 390x844, 430x932, 768x1024, 820x1180, 1024x1366.
// Chromium via Playwright. WebKit is a separate run (ENGINE=webkit) and is not iOS Safari.
//
//   CHROME=/usr/bin/google-chrome PORT=8102 node tests/e2e/run.cjs   (ONLY=ioslayout)
//   CHROME=/usr/bin/google-chrome BASE=http://127.0.0.1:8102/index.html node tests/e2e/ioslayout.cjs
//
// Isolated synthetic profiles only (fresh context localStorage). Piano key widths are not
// required to be 44px. A key whose centre sits inside the keyboard is on screen; a slid
// window is not loaded here, so an off-screen key is a failure at rest.
const { chromium, webkit } = require('playwright-core');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = process.env.OUT || path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || undefined;
const ENGINE = process.env.ENGINE || 'chromium';
const PHONES = [[375, 667], [390, 844], [430, 932]];
const TABLETS = [[768, 1024], [820, 1180], [1024, 1366]];
const SIZES = [...PHONES, ...TABLETS].flatMap(([w, h]) => [[w, h], [h, w]]);
const STYLES = ['Pop', 'Jazz', 'R&B', 'Ballad', 'Reggae', 'Funk', 'Yoga', 'Country'];

function expectLay(w, h) {
  const land = w > h;
  const regular = w >= 768 && h >= 600;
  return regular ? (land ? 'lay-pad-land' : 'lay-pad-port') : (land ? 'lay-phone-land' : 'lay-phone-port');
}
function profile(mode, look) {
  return {
    settings: { v: 1, settings: { style: 'pop', simple: mode === 'simple', expert: mode !== 'kids', theme: mode === 'kids' ? look : 'auto', playAlong: true, paHints: false, lockKey: { pc: 0, mode: 'major' }, layout: 'octave' } },
    expert: { v: 1, on: mode === 'expert', look: mode === 'expert' ? look : 'auto' },
    slook: { v: 1, look: mode === 'simple' ? look : 'auto' }
  };
}

function measure() {
  const de = document.documentElement;
  const vw = innerWidth, vh = innerHeight;
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const hidden = s.display === 'none' || s.visibility === 'hidden' || !!el.closest('[hidden]');
    return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, vis: !hidden && r.width > 0.5 && r.height > 0.5 };
  };
  const ov = (a, b) => a && b && a.vis && b.vis && a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
  const hitOf = (el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const on = (x, y) => {
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
      const t = document.elementFromPoint(x, y);
      return !!(t && (t === el || el.contains(t)));
    };
    let top = 0, bot = 0, left = 0, right = 0;
    while (on(cx, cy - top - 1) && top < 24) top += 1;
    while (on(cx, cy + bot + 1) && bot < 24) bot += 1;
    while (on(cx - left - 1, cy) && left < 24) left += 1;
    while (on(cx + right + 1, cy) && right < 24) right += 1;
    return { w: r.width + left + right, h: r.height + top + bot };
  };
  const blocks = {
    grid: box(document.querySelector('.next-card')),
    kb: box(document.querySelector('.kb-wrap')),
    sus: box(document.querySelector('#sustainBtn')),
    ctl: box(document.querySelector('#xCtl')),
    now: box(document.querySelector('.now-card')),
    kidsPiano: box(document.querySelector('.kv-play:not([hidden]) .kv-piano')),
    kidsPads: box(document.querySelector('.kv-play:not([hidden]) .kv-pads')),
    kidsCtl: box(document.querySelector('.kv-play:not([hidden]) .kv-ctl'))
  };
  const pairs = [['grid', 'kb'], ['ctl', 'kb'], ['sus', 'kb'], ['sus', 'grid'], ['ctl', 'grid'], ['now', 'grid'], ['now', 'kb'], ['kidsPads', 'kidsPiano'], ['kidsCtl', 'kidsPiano'], ['kidsCtl', 'kidsPads'], ['kidsPads', 'kidsCtl']];
  const hits = pairs.filter(([a, b]) => ov(blocks[a], blocks[b])).map(([a, b]) => a + '/' + b);
  const off = [];
  for (const el of document.querySelectorAll('button, .ss-chip, .ss-note, .kv-pad, .pad, .kv-wk, .kv-bk')) {
    const b = box(el);
    if (!b || !b.vis) continue;
    if (el.classList.contains('pad') || el.classList.contains('kv-wk') || el.classList.contains('kv-bk')) continue;
    if (b.l < -1 || b.t < -1 || b.r > vw + 1 || b.b > vh + 1) off.push((el.id || el.getAttribute('aria-label') || el.className || 'el').toString().slice(0, 40));
  }
  const kb = document.querySelector('.kb-wrap');
  const kbr = kb && box(kb);
  let keyOff = 0;
  if (kbr && kbr.vis) {
    for (const k of document.querySelectorAll('#pads .pad')) {
      const b = box(k);
      if (!b || !b.vis) continue;
      const cx = b.l + b.w / 2, cy = b.t + b.h / 2;
      if (cx < kbr.l - 1 || cx > kbr.r + 1 || cy < kbr.t - 1 || cy > kbr.b + 1) keyOff += 1;
    }
  }
  const piano = document.querySelector('.kv-play:not([hidden]) .kv-piano');
  const pr = piano && box(piano);
  if (pr && pr.vis) {
    for (const k of piano.querySelectorAll('.kv-wk, .kv-bk')) {
      const b = box(k);
      if (!b || !b.vis) continue;
      const cx = b.l + b.w / 2, cy = b.t + b.h / 2;
      if (cx < pr.l - 1 || cx > pr.r + 1 || cy < pr.t - 1 || cy > pr.b + 1) keyOff += 1;
    }
  }
  const badge = box(document.querySelector('#dev-badge'));
  const badgeHits = [];
  if (badge && badge.vis) {
    for (const el of document.querySelectorAll('button, .ss-chip, .ss-note, .kv-pad, .pad, .kv-wk, .kv-bk, .mode-chip')) {
      if (ov(badge, box(el))) badgeHits.push((el.id || el.getAttribute('aria-label') || el.textContent || '').toString().replace(/\s+/g, ' ').trim().slice(0, 24));
    }
  }
  const small = [];
  const sels = [['#xKey', 'btn'], ['#xStyle', 'btn'], ['#xModeChip', 'btn'], ['#xHelp', 'help'], ['#xTog', 'track'], ['#xNext', 'btn'], ['#xPlay', 'btn'], ['#sustainBtn', 'sustain'], ['#xFull', 'btn'], ['#xSound', 'btn'], ['#xKeysChip', 'keyschip'], ['.kv-home', 'btn'], ['.kv-playbtn', 'btn'], ['.kv-next', 'btn'], ['header.topbar .mode-chip', 'btn'], ['#howtoBtn', 'help']];
  const prim = [];
  for (const [sel, kind] of sels) {
    const el = document.querySelector(sel);
    const b = box(el);
    if (!b || !b.vis) continue;
    const hit = (b.w < 44 || b.h < 44) ? hitOf(el) : { w: b.w, h: b.h };
    prim.push({ sel, kind, w: Math.round(b.w), h: Math.round(b.h), hw: Math.round(hit.w), hh: Math.round(hit.h) });
  }
  for (const el of document.querySelectorAll('#xTog button, .style-row button, .kv-pad')) {
    const b = box(el);
    if (!b || !b.vis) continue;
    const kind = el.classList.contains('kv-pad') ? 'pad' : (el.closest('#xTog') ? 'segment' : 'style');
    const hit = (b.w < 44 || b.h < 44) ? hitOf(el) : { w: b.w, h: b.h };
    prim.push({ sel: kind, kind, w: Math.round(b.w), h: Math.round(b.h), hw: Math.round(hit.w), hh: Math.round(hit.h), t: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 16) });
  }
  const clipped = [];
  for (const el of document.querySelectorAll('#xFull, #xSound, #xKeysChip, #xStyle, #xNext, #xTog button, .kv-next, .kv-home, header.topbar .mode-chip')) {
    const b = box(el);
    if (!b || !b.vis) continue;
    if (el.scrollWidth > el.clientWidth + 3) clipped.push((el.id || el.textContent || '').toString().replace(/\s+/g, ' ').trim().slice(0, 24) + ' ' + el.scrollWidth + '>' + el.clientWidth);
  }
  const chips = [...document.querySelectorAll('#suggest .ss-chip, #suggest .ss-note, .kv-play:not([hidden]) .kv-pad')].map(box).filter((b) => b && b.vis);
  const chipMin = chips.length ? Math.min(...chips.map((b) => b.h)) : 0;
  const typeVis = box(document.querySelector('#xType'));
  const chordsVis = box(document.querySelector('#chords'));
  const suggest = box(document.querySelector('#suggest'));
  let ctlFill = null;
  const ctl = document.querySelector('#xCtl');
  if (blocks.ctl && blocks.ctl.vis && ctl) {
    const btns = [...ctl.querySelectorAll('button')].map(box).filter((b) => b && b.vis);
    if (btns.length) {
      const top = Math.min(...btns.map((b) => b.t)), bot = Math.max(...btns.map((b) => b.b));
      ctlFill = (bot - top) / blocks.ctl.h;
    }
  }
  let susFill = null;
  if (blocks.sus && blocks.sus.vis) susFill = 1;
  const nokeys = [...document.querySelectorAll('#pads .pad.nokey')].map((k) => {
    const b = box(k);
    const nm = k.querySelector('.nm');
    const nr = nm ? nm.getBoundingClientRect() : null;
    return { vis: !!(b && b.vis), label: nm ? (nm.textContent || '') : '', inside: !!(nr && b && nr.left >= b.l - 1 && nr.right <= b.r + 1 && nr.top >= b.t - 1 && nr.bottom <= b.b + 1) };
  });
  const whiteIn = document.querySelector('#pads .pad.white:not(.nokey)');
  const blackOut = document.querySelector('#pads .pad.black.nokey');
  const nokeyInk = whiteIn && blackOut ? { in: getComputedStyle(whiteIn).backgroundColor, out: getComputedStyle(blackOut).backgroundColor, op: getComputedStyle(blackOut).opacity } : null;
  let dot = null;
  const rk = document.querySelector('#pads .pad.nx-root');
  if (rk) {
    const s = getComputedStyle(rk, '::before');
    const r = rk.getBoundingClientRect();
    const w = parseFloat(s.width), h = parseFloat(s.height), top = parseFloat(s.top), left = parseFloat(s.left), ml = parseFloat(s.marginLeft) || 0;
    const cx = left + ml + w / 2;
    dot = { w, h, top, cx, mid: r.width / 2, keyH: r.height, centered: Math.abs(cx - r.width / 2) <= 5, topBand: (top + h / 2) <= r.height * 0.4, inside: cx > 0 && cx < r.width && top >= 0 && top + h <= r.height };
  }
  const bg = getComputedStyle(document.body).backgroundColor;
  const scrollW = document.documentElement.scrollWidth;
  const scrollH = document.documentElement.scrollHeight;
  const padB = de.classList.contains('expert') ? getComputedStyle(document.querySelector('#app')).paddingBottom : null;
  return {
    cls: de.className, bg, hits, off: off.slice(0, 8), keyOff, badgeHits: [...new Set(badgeHits)].slice(0, 8),
    prim, clipped, chipMin: Math.round(chipMin), chips: chips.length,
    typeVis: !!(typeVis && typeVis.vis), chordsVis: !!(chordsVis && chordsVis.vis), suggest: !!(suggest && suggest.vis),
    keys: document.querySelectorAll('#pads .pad').length,
    whites: document.querySelectorAll('#pads .pad.white').length,
    ctlFill, susFill, nokey: nokeys.length, nokeyBad: nokeys.filter((k) => !k.vis || !k.label || !k.inside).length, nokeyInk,
    dot, blocks: Object.fromEntries(Object.entries(blocks).filter(([, v]) => v && v.vis).map(([k, v]) => [k, { w: Math.round(v.w), h: Math.round(v.h), l: Math.round(v.l), t: Math.round(v.t), r: Math.round(v.r), b: Math.round(v.b) }])),
    scrollW, scrollH, vw, vh, padB,
    gridRight: !!(blocks.grid && blocks.grid.vis && blocks.sus && blocks.sus.vis && blocks.grid.l >= blocks.sus.r - 2)
  };
}

function touchFails(row, lay, h) {
  const bad = [];
  const short = lay === 'lay-phone-land' && h < 500;
  const pad = lay.startsWith('lay-pad');
  for (const p of row.prim) {
    if (p.kind === 'segment') {
      if (p.h < 32 || p.w < 32) bad.push(p.sel + ' segment ' + p.w + 'x' + p.h);
      continue;
    }
    if (p.kind === 'track') {
      if (pad && (p.w < 44 || p.h < 44)) bad.push('track ' + p.w + 'x' + p.h);
      else if (!pad && !short && p.h < 40) bad.push('track ' + p.w + 'x' + p.h);
      continue;
    }
    if (lay === 'lay-pad-land') {
      /* Approved landscape sizes stay. Do not fail a 40px row for not being a 44px slab. */
      if (p.kind === 'keyschip') { if (p.hh < 44 && p.h < 32) bad.push('keys chip ' + p.h + ' hit ' + p.hh); }
      else if (p.h < 36 || p.w < 36) bad.push((p.t || p.sel) + ' ' + p.w + 'x' + p.h);
      continue;
    }
    if (short) {
      if (p.kind === 'sustain' && p.hh < 44) bad.push('sustain hit ' + p.hh);
      else if (p.kind === 'help' && p.hh < 44 && p.hw < 44) bad.push('help hit ' + p.hw + 'x' + p.hh);
      else if (p.kind === 'style' && p.hh < 40 && p.h < 26) bad.push('style ' + p.w + 'x' + p.h);
      else if (p.kind !== 'sustain' && p.kind !== 'help' && p.kind !== 'style' && (p.h < 30 || p.w < 30)) bad.push((p.t || p.sel) + ' ' + p.w + 'x' + p.h);
      continue;
    }
    if (p.kind === 'style' && !pad) {
      if (p.hh < 44 || p.h < 34) bad.push('style hit ' + p.h + '/' + p.hh);
      continue;
    }
    if (p.kind === 'keyschip' && !pad) {
      if (p.hh < 44 && p.h < 44) bad.push('keys chip ' + p.w + 'x' + p.h + ' hit ' + p.hh);
      continue;
    }
    if (p.w < 44 || p.h < 44) bad.push((p.t || p.sel) + ' ' + p.w + 'x' + p.h);
  }
  return bad;
}

function menuState() {
  const vh = innerHeight, vw = innerWidth;
  const fully = (el, host) => {
    const a = el.getBoundingClientRect(), b = host.getBoundingClientRect();
    return a.height > 8 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1 && a.top >= -1 && a.bottom <= vh + 1 && a.left >= -1 && a.right <= vw + 1;
  };
  const style = () => {
    const b = document.querySelector('#xStyle');
    if (!b) return { missing: true };
    b.click();
    const m = document.querySelector('#xStyleMenu');
    if (!m || m.hidden) return { open: false };
    const names = [...m.querySelectorAll('.x-mi')].map((n) => n.querySelector('b').textContent);
    m.scrollTop = m.scrollHeight;
    const last = m.querySelector('.x-mi:last-child');
    const lastOk = fully(last, m);
    const lr = last.getBoundingClientRect();
    const hit = document.elementFromPoint(lr.left + 8, lr.top + lr.height / 2);
    const dismiss = b.getBoundingClientRect();
    const dhit = document.elementFromPoint(dismiss.left + dismiss.width / 2, dismiss.top + dismiss.height / 2);
    const viaButton = !!(dhit && (dhit === b || b.contains(dhit)));
    const viaScrim = !!(dhit && (dhit.id === 'xScrim' || (dhit.closest && dhit.closest('#xScrim'))));
    const dismissOk = dismiss.height > 8 && dismiss.top >= 0 && dismiss.bottom <= vh && (viaButton || viaScrim);
    if (viaScrim) dhit.click(); else b.click();
    return { open: true, names, lastOk, hit: !!(hit && (hit === last || last.contains(hit))), closed: document.querySelector('#xStyleMenu').hidden, dismissOk, via: viaButton ? 'button' : (viaScrim ? 'scrim' : (dhit && (dhit.id || dhit.className))) };
  };
  const sheet = () => {
    if (!window.__ms) return { missing: true };
    window.__ms.open(true);
    const sheetEl = document.querySelector('.ms-sheet');
    const x = document.querySelector('.ms-x');
    const ver = document.querySelector('.ms-ver');
    if (!sheetEl || !x || !ver) return { open: false };
    sheetEl.scrollTop = sheetEl.scrollHeight;
    const lastOk = fully(ver, sheetEl);
    const xr = x.getBoundingClientRect();
    const xOk = xr.width >= 24 && xr.height >= 24 && xr.top >= 0 && xr.bottom <= vh && xr.left >= 0 && xr.right <= vw;
    x.click();
    return { open: true, lastOk, xOk, closed: document.querySelector('#modeSheet').hidden };
  };
  return { style: style(), sheet: sheet() };
}

async function soundAndList() {
  const vh = innerHeight, vw = innerWidth;
  const fully = (el, host) => {
    const a = el.getBoundingClientRect(), b = host.getBoundingClientRect();
    return a.height > 8 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1 && a.bottom <= vh + 1;
  };
  const soundBtn = document.querySelector('#xSound');
  if (soundBtn) soundBtn.click();
  const ctl = document.querySelector('#ctl');
  const soundOn = document.documentElement.classList.contains('x-ctl-on') && ctl && getComputedStyle(ctl).display !== 'none';
  let sound = { open: !!soundOn };
  if (soundOn) {
    const scroller = ctl;
    scroller.scrollTop = scroller.scrollHeight;
    const last = scroller.querySelector('.band-row, .x-volrow, button, input');
    const nodes = [...scroller.querySelectorAll('button, input, .band-row')].filter((n) => n.getClientRects().length);
    const end = nodes[nodes.length - 1] || last;
    sound.lastOk = !!(end && fully(end, scroller));
    const br = soundBtn.getBoundingClientRect();
    const bh = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
    sound.btnHit = br.height > 8 && br.top >= 0 && br.bottom <= vh && !!(bh && (bh === soundBtn || soundBtn.contains(bh)));
    if (sound.btnHit) soundBtn.click();
    else {
      let found = false;
      for (let y = 24; y < vh - 16 && !found; y += 16) {
        const t = document.elementFromPoint(6, y);
        if (t && (t.id === 'xScrim' || t.classList.contains('x-scrim'))) { t.click(); found = true; }
      }
      sound.scrimHit = found;
    }
    sound.closed = !document.documentElement.classList.contains('x-ctl-on');
  }
  const jazz = document.querySelector('#styles button[data-style="jazz"]');
  if (jazz) jazz.click();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const bar = document.querySelector('.x-pbar');
  let list = { missing: !bar };
  if (bar) {
    bar.click();
    const m = document.querySelector('#xPList');
    list.open = !!(m && !m.hidden);
    if (list.open) {
      m.scrollTop = m.scrollHeight;
      const rows = [...m.querySelectorAll('.x-prow')];
      const last = rows[rows.length - 1];
      list.n = rows.length;
      list.lastOk = !!(last && fully(last, m));
      const r = last.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.min(vw - 2, r.left + 10), r.top + r.height / 2);
      list.hit = !!(hit && (hit === last || last.contains(hit)));
      const scrim = document.querySelector('#xScrim');
      if (scrim && !scrim.hidden) scrim.click();
      list.closed = document.querySelector('#xPList').hidden;
    }
  }
  return { sound, list };
}

const R = { fails: [], passes: 0, data: { engine: ENGINE, sizes: SIZES.map((s) => s.join('x')) } };
const F = (ok, msg) => { if (ok) R.passes += 1; else R.fails.push(msg); };

function judge(tag, lay, h, mode, row) {
  F(row.cls.includes(lay), tag + ' class ' + lay + ' got ' + (row.cls.match(/lay-[\w-]+/) || [''])[0]);
  F(!row.hits.length, tag + ' collisions ' + row.hits.join(','));
  F(!row.off.length, tag + ' off screen ' + row.off.join('|'));
  F(row.keyOff === 0, tag + ' key centres outside the keyboard ' + row.keyOff);
  F(!row.badgeHits.length, tag + ' badge covers ' + row.badgeHits.join(','));
  F(!row.clipped.length, tag + ' clipped ' + row.clipped.join('|'));
  F(row.scrollW <= row.vw + 1, tag + ' horizontal overflow ' + row.scrollW + '>' + row.vw);
  const touch = touchFails(row, lay, h);
  F(!touch.length, tag + ' touch ' + touch.slice(0, 6).join('; '));
  if (mode === 'expert') {
    F(!row.typeVis && !row.chordsVis, tag + ' type table visible');
    F(row.suggest && row.chips >= 8, tag + ' playable grid ' + row.chips);
    F(row.keys === 12 && row.whites === 7, tag + ' keys ' + row.keys + '/' + row.whites);
    F(row.nokey >= 5 && row.nokeyBad === 0, tag + ' dimmed keys ' + row.nokey + ' bad ' + row.nokeyBad);
    F(row.nokeyInk && row.nokeyInk.in !== row.nokeyInk.out && row.nokeyInk.op === '1', tag + ' nokey ink ' + JSON.stringify(row.nokeyInk));
    if (lay.endsWith('land')) {
      F(row.gridRight, tag + ' grid not right of sustain');
      F(row.blocks.kb && row.blocks.kb.t >= (row.blocks.grid ? row.blocks.grid.b : 0) - 1, tag + ' piano not under the grid');
    }
    if (lay === 'lay-pad-land') {
      /* Approved arrangement: fixed ~300px piano, grid on the right. A short browser window is not a reason to restack this. */
      F(row.blocks.kb && row.blocks.kb.h >= 280 && row.blocks.kb.h <= 320, tag + ' piano height ' + (row.blocks.kb && row.blocks.kb.h));
      F(row.blocks.ctl && row.blocks.sus && row.blocks.ctl.l <= row.blocks.sus.r && row.blocks.grid && row.blocks.grid.l >= row.blocks.ctl.r - 2, tag + ' landscape columns moved');
    }
    if (lay === 'lay-phone-land') F(row.blocks.kb && row.blocks.kb.h >= 100 && row.blocks.kb.h <= 130, tag + ' phone piano ' + (row.blocks.kb && row.blocks.kb.h));
    if (lay === 'lay-pad-port') F(row.chipMin >= 44, tag + ' pad chip ' + row.chipMin);
    if (row.dot) F(row.dot.inside && row.dot.centered && row.dot.topBand && row.dot.w >= 6 && row.dot.w <= 12, tag + ' root dot ' + JSON.stringify(row.dot));
    else F(false, tag + ' root dot missing');
  }
  if (mode === 'kids') {
    F(row.chips === 7, tag + ' kids pads ' + row.chips);
    F(row.blocks.kidsPiano && row.blocks.kidsPiano.h >= 80, tag + ' kids piano');
  }
  if (mode === 'simple') {
    F(row.suggest && row.chips >= 8, tag + ' simple grid ' + row.chips);
    F(!row.blocks.kb, tag + ' simple showed a keyboard');
  }
}

async function boot(page, mode) {
  await page.waitForFunction((m) => {
    const de = document.documentElement;
    if (de.classList.contains('tc-boot')) return false;
    if (m === 'expert') return de.classList.contains('expert');
    if (m === 'kids') return de.classList.contains('kv') && !!window.__kv;
    return de.classList.contains('simple') && !de.classList.contains('expert') && !de.classList.contains('kv');
  }, mode, { timeout: 8000 });
  if (mode === 'kids') {
    await page.evaluate(() => window.__kv.show('play'));
    await page.waitForFunction(() => { const p = document.querySelector('.kv-play'); return p && !p.hidden; });
  }
  if (mode === 'expert') {
    await page.waitForFunction(() => document.querySelector('#pads .pad.nx-root'), null, { timeout: 4000 }).catch(() => {});
  }
}

async function openContext(browser, w, h, mode, look) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ctx.addInitScript((p) => {
    localStorage.clear();
    localStorage.setItem('touchChord.tour.v1', 'done');
    localStorage.setItem('touchChord.settings.v1', JSON.stringify(p.settings));
    localStorage.setItem('touchChord.expert.v1', JSON.stringify(p.expert));
    localStorage.setItem('touchChord.simpleLook.v1', JSON.stringify(p.slook));
    localStorage.setItem('touchChord.notes.v1', JSON.stringify({ denseMoved: true }));
  }, profile(mode, look));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const base = process.env.BASE || process.env.URL;
  const q = (mode === 'expert' ? 'test=1&hour=12&expert=1' : 'test=1&hour=12');
  await page.goto(base + (base.includes('?') ? '&' : '?') + q, { waitUntil: 'domcontentloaded' });
  await boot(page, mode);
  return { ctx, page, errs };
}

function serve() {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.json': 'application/json', '.png': 'image/png' };
  return http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(r);
  });
}

(async () => {
  let srv = null;
  if (!process.env.BASE && !process.env.URL) {
    const port = +(process.env.PORT || 8102);
    srv = serve();
    await new Promise((res) => srv.listen(port, '127.0.0.1', res));
    process.env.BASE = `http://127.0.0.1:${port}/index.html`;
  }
  const launcher = ENGINE === 'webkit' ? webkit : chromium;
  let browser;
  try {
    browser = await launcher.launch(ENGINE === 'webkit' ? {} : { executablePath: CHROME });
  } catch (e) {
    const msg = ENGINE + ' launch failed: ' + e.message.split('\n')[0];
    fs.writeFileSync(path.join(OUT, 'ioslayout.json'), JSON.stringify({ fails: [msg], passes: 0, engine: ENGINE, skipped: true }, null, 2));
    console.log(msg);
    if (srv) srv.close();
    process.exit(ENGINE === 'webkit' ? 0 : 1);
  }
  R.data.engineVersion = browser.version();
  const looks = ['day', 'lamp'];
  for (const mode of ['expert', 'simple', 'kids']) {
    for (const look of looks) {
      for (const [w, h] of SIZES) {
        const tag = `${mode}/${look}/${w}x${h}`;
        const lay = expectLay(w, h);
        let ctx;
        try {
          const opened = await openContext(browser, w, h, mode, look);
          ctx = opened.ctx;
          const row = await opened.page.evaluate(measure);
          F(!opened.errs.length, tag + ' pageerror ' + opened.errs[0]);
          if (look === 'lamp') F(/rgb\(\s*(\d+)/.exec(row.bg) && +/rgb\(\s*(\d+)/.exec(row.bg)[1] < 80, tag + ' lamp bg ' + row.bg);
          else F(/rgb\(\s*(\d+)/.exec(row.bg) && +/rgb\(\s*(\d+)/.exec(row.bg)[1] > 180, tag + ' day bg ' + row.bg);
          judge(tag, lay, h, mode, row);
          if (mode === 'expert' && row.dot) R.data[tag] = { dot: row.dot, blocks: row.blocks, chipMin: row.chipMin, ctlFill: row.ctlFill };
          const menus = (mode === 'expert' && (h < w) && (h <= 430 || w >= 1024)) || (look === 'day' && ((w === 375 && h === 667) || (w === 1024 && h === 768)));
          if (menus && mode === 'expert') {
            const menu = await opened.page.evaluate(menuState);
            F(menu.style && menu.style.open && menu.style.names.join('|') === STYLES.join('|'), tag + ' styles ' + JSON.stringify(menu.style && menu.style.names));
            F(menu.style && menu.style.lastOk && menu.style.hit, tag + ' style last not reachable ' + JSON.stringify(menu.style));
            F(menu.style && menu.style.closed && menu.style.dismissOk, tag + ' style dismiss ' + JSON.stringify(menu.style));
            F(menu.sheet && menu.sheet.lastOk && menu.sheet.xOk && menu.sheet.closed, tag + ' settings ' + JSON.stringify(menu.sheet));
            const pop = await opened.page.evaluate(soundAndList);
            F(pop.sound && pop.sound.open && pop.sound.lastOk && pop.sound.closed && (pop.sound.btnHit || pop.sound.scrimHit), tag + ' sound sheet ' + JSON.stringify(pop.sound));
            F(pop.list && pop.list.open && pop.list.n >= 6 && pop.list.lastOk && pop.list.hit && pop.list.closed, tag + ' progression list ' + JSON.stringify(pop.list));
          } else if (menus && mode !== 'expert') {
            const menu = await opened.page.evaluate(menuState);
            F(menu.sheet && menu.sheet.lastOk && menu.sheet.xOk && menu.sheet.closed, tag + ' settings ' + JSON.stringify(menu.sheet));
          }
        } catch (e) {
          F(false, tag + ' crashed ' + e.message.split('\n')[0]);
        } finally { if (ctx) await ctx.close(); }
      }
    }
  }
  for (const mode of ['expert', 'simple', 'kids']) {
    for (const [w, h] of [[375, 667], [820, 1180]]) {
      const tag = `turn/${mode}/${w}x${h}`;
      let ctx;
      try {
        const opened = await openContext(browser, w, h, mode, 'day');
        ctx = opened.ctx;
        const page = opened.page;
        await page.setViewportSize({ width: h, height: w });
        await page.evaluate(() => window.tcApplySizeClass());
        await page.waitForTimeout(400);
        if (mode === 'kids') await page.evaluate(() => window.__kv.show('play'));
        const land = await page.evaluate(measure);
        judge(tag + '>land', expectLay(h, w), w, mode, land);
        await page.setViewportSize({ width: w, height: h });
        await page.evaluate(() => window.tcApplySizeClass());
        await page.waitForTimeout(400);
        if (mode === 'kids') await page.evaluate(() => window.__kv.show('play'));
        const port = await page.evaluate(measure);
        judge(tag + '>port', expectLay(w, h), h, mode, port);
      } catch (e) {
        F(false, tag + ' crashed ' + e.message.split('\n')[0]);
      } finally { if (ctx) await ctx.close(); }
    }
  }
  {
    const tag = 'safe-area';
    const opened = await openContext(browser, 390, 844, 'expert', 'day');
    try {
      const before = await opened.page.evaluate(() => getComputedStyle(document.querySelector('#app')).paddingTop);
      F(parseFloat(before) === 10, tag + ' padding-top at inset 0 is ' + before);
      let cdp = 'unsupported';
      try {
        const client = await opened.ctx.newCDPSession(opened.page);
        await client.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, left: 0, right: 0, bottom: 34 } });
        cdp = 'setSafeAreaInsetsOverride';
      } catch (e1) {
        try {
          const client = await opened.ctx.newCDPSession(opened.page);
          await client.send('Emulation.setSafeAreaInsets', { top: 47, left: 0, right: 0, bottom: 34 });
          cdp = 'setSafeAreaInsets';
        } catch (e2) { cdp = 'unavailable: ' + e1.message.split('\n')[0]; }
      }
      R.data.safeAreaCdp = cdp;
      if (cdp === 'setSafeAreaInsetsOverride' || cdp === 'setSafeAreaInsets') {
        await opened.page.waitForTimeout(50);
        const after = await opened.page.evaluate(() => {
          const s = getComputedStyle(document.querySelector('#app'));
          return { top: s.paddingTop, bottom: s.paddingBottom, spacer: !!document.querySelector('.status-bar, .safe-spacer, #statusBar') };
        });
        const top = parseFloat(after.top), bot = parseFloat(after.bottom);
        F(Math.abs(top - 57) < 1.5, tag + ' top padding should grow by the inset once (' + after.top + ')');
        F(Math.abs(bot - (6 + 34)) < 1.5, tag + ' bottom padding should grow by the inset once (' + after.bottom + ')');
        F(!after.spacer, tag + ' fixed status spacer present');
      } else {
        const src = fs.readFileSync(path.join(ROOT, 'css/expert.css'), 'utf8');
        F(src.includes('env(safe-area-inset-top)') && src.includes('env(safe-area-inset-bottom)'), tag + ' expert padding does not use safe-area env()');
        F(cdp.startsWith('unavailable'), tag + ' cdp ' + cdp);
        R.data.safeArea = 'stylesheet only; runtime inset override unavailable (' + cdp + ')';
      }
    } catch (e) {
      F(false, tag + ' crashed ' + e.message.split('\n')[0]);
    } finally { await opened.ctx.close(); }
  }
  await browser.close();
  if (srv) srv.close();
  fs.writeFileSync(path.join(OUT, 'ioslayout.json'), JSON.stringify({ fails: R.fails, passes: R.passes, engine: ENGINE, version: R.data.engineVersion, safeArea: R.data.safeArea || R.data.safeAreaCdp }, null, 2));
  console.log(`ioslayout ${ENGINE}: ${R.passes} checks passed, ${R.fails.length} fails`);
  R.fails.slice(0, 80).forEach((f) => console.log('  ' + f));
  process.exit(R.fails.length ? 1 : 0);
})();
