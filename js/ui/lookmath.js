// rd6 Look: Auto · Day · Lamp. Pure rules (no DOM), unit-tested in tests/unit/look.test.js.
// Auto follows the device clock: Day from 7:00 up to (not including) 19:00, Lamp the rest of the day.
export const LOOK_CHOICES = ["auto", "day", "lamp"];
export const LOOK_LABELS = { auto: "Auto", day: "Day", lamp: "Lamp" };
export const LOOK_DAY_FROM = 7, LOOK_DAY_TO = 19;
export const LOOK_PAUSE_MS = 4000;   // Auto switches at the boundary only after this long with no notes
export function sanitizeLook(v, def) { return LOOK_CHOICES.indexOf(v) >= 0 ? v : def; }
export function autoLook(date) { var h = (date || new Date()).getHours(); return h >= LOOK_DAY_FROM && h < LOOK_DAY_TO ? "day" : "lamp"; }
export function lookFor(pick, date) { return pick === "day" || pick === "lamp" ? pick : autoLook(date); }
// May Auto change the shown look now? Only after a pause in playing (no held note, no Play song / loop, and the last
// note started or ended at least pauseMs ago).
export function lookQuiet(o, pauseMs) {
  if (o.busy) return false;
  return o.now - o.lastNote >= (pauseMs == null ? LOOK_PAUSE_MS : pauseMs);
}
