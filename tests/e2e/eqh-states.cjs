// rd13: the screens / sheets / panels the equal-height audit visits, per mode (shared by rd13.cjs and the scratch runs).
const V13 = require('fs').readFileSync(require('path').join(__dirname, '../fixtures/upload/anh-v13.json'), 'utf8');
const ck = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const wait = (p, ms) => p.waitForTimeout(ms || 350);
const sheet = async p => { await p.evaluate(() => __ms.open(true)); await wait(p); };
const confirm = async p => { await sheet(p); await ck(p, '#msReset'); await wait(p); };
const song = async p => { await p.evaluate(t => __upload.load(t), V13); await wait(p, 700); };
module.exports = {
  kids: [
    ['hello', async p => { await p.evaluate(() => __kv.show('hello')); await wait(p); }],
    ['songs', async p => { await p.evaluate(() => __kv.show('songs')); await wait(p); }],
    ['play', async p => { await p.evaluate(() => __kv.show('play')); await wait(p); }],
    ['sheet', sheet], ['confirm', confirm]],
  simple: [
    ['main', async () => {}],
    ['song', song],
    ['key picker', async p => { await ck(p, '#keyChip'); await wait(p); }],
    ['sheet', sheet], ['confirm', confirm]],
  expert: [
    ['main', async () => {}],
    ['song', async p => { await song(p); await ck(p, '#xTog button[data-v="song"]'); await wait(p); }],
    ['prog list', async p => { await ck(p, '#xTog button[data-v="prog"]'); await wait(p); await ck(p, '#xSrc .x-pbar'); await wait(p); }],
    ['style menu', async p => { await ck(p, '#xStyle'); await wait(p); }],
    ['key sheet', async p => { await ck(p, '#xKey'); await wait(p); }],
    ['type open', async p => { await p.evaluate(() => { const b = document.getElementById('xType'); b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); await wait(p); }],
    ...['sound', 'fx', 'key', 'loop'].map(t => ['sound ' + t, async p => { await ck(p, '#xSound'); await wait(p); await ck(p, `#ctl .ctl-tabs button[data-tab="${t}"]`); await wait(p); }]),
    ['keys full', async p => { await p.evaluate(() => __xmode.setKeys('full')); await wait(p); }],
    ['keys buttons', async p => { await p.evaluate(() => __xmode.setKeys('buttons')); await wait(p); }],
    ['sheet', sheet], ['confirm', confirm]],
};
