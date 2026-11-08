// Eight border slots for one chord's progression steps, in order:
// top-left, top-right, bottom-right, bottom-left, top-centre, right-centre, bottom-centre, left-centre.
// The number painted in a slot is the step's own index (1, 5, 9), never its place in this list (1, 2, 3).
// A 9th step and after keeps that number and walks outward on the same slot; it is not dropped or renumbered.
export const BADGE_SLOTS = ["tl", "tr", "br", "bl", "tc", "rc", "bc", "lc"];
const XY = [
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
  { x: 0.5, y: 0 }, { x: 1, y: 0.5 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }
];
// Pull a border-centred badge sideways just enough that its box stays inside the
// gutter's midpoint. Edge centres that already fit are left on the border point.
// A chip narrower than the badge cannot be saved this way; the caller keeps the border point.
export function badgeInset(center, box, bw, bh, gapX) {
  var half = (gapX || 0) / 2;
  var minX = box.left + bw / 2 - half;
  var maxX = box.left + box.width - bw / 2 + half;
  if (!(bw > 0) || minX > maxX) return center;
  var x = Math.min(maxX, Math.max(minX, center.x));
  if (x === center.x) return center;
  return { x: x, y: center.y, slot: center.slot, anchor: center.anchor, ring: center.ring, ord: center.ord, inset: true };
}
export function badgeCenter(box, ord, bw, bh) {
  var ring = Math.floor(Math.max(0, ord) / 8);
  var sl = XY[Math.max(0, ord) % 8];
  var nx = sl.x - 0.5, ny = sl.y - 0.5, len = Math.sqrt(nx * nx + ny * ny) || 1;
  nx /= len; ny /= len;
  var out = ring * (Math.max(bw || 0, bh || 0) + 2);
  return {
    x: box.left + box.width * sl.x + nx * out,
    y: box.top + box.height * sl.y + ny * out,
    slot: ring ? "over" : BADGE_SLOTS[ord],
    anchor: BADGE_SLOTS[Math.max(0, ord) % 8],
    ring: ring,
    ord: ord
  };
}
