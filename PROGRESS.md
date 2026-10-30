# Touch Chord Expert redesign: progress (LOCAL ONLY, never pushed)

Branch `expert-build` off 351c02c (v112.13, production). Working copy: /workspace/chord-touch/expertredesign/repo
(node_modules is a symlink to /workspace/chord-touch/v13/repo/node_modules, git-ignored). Mirror target: /workspace/touch-chord-redesign-fork (remote `expertsrc`, branch expert-build only).
Spec: /workspace/touchchord-review/redesign/expert-v9-*.png, expert-ipad-v2-*.png (+ expert.html, expert-ipad.html). Decisions 1-11 from the user via Uiux.

## Plan / architecture
- Expert = a new screen set (html.expert) over the Full-mode app: same DOM controls (strip #suggest, #palette, #sustainBtn, #ctl, #pads),
  re-laid out by css/expert.css, plus new Expert-only controls built by js/expert/ui.js. No audio/theory/songs change.
- Expert is ON when the Expert pref is on (localStorage touchChord.expert.v1, separate from touchChord.settings.v1) and the app is
  not Simple and not Kids style. Mode switch (Kids / Simple / Expert) in Settings (Expert sheet) and in the gear menu.
- Pure logic in js/expert/model.js (unit-tested): mode switch, Type bar toggle, Song | Progressions control, labels.
- Only shared-file edits: index.html (+1 css link), js/main.js (+import/+boot call), js/ui/pads.js (window key count hook, 12 keys = C..B in Expert),
  tests/e2e/run.cjs (+expert suite).

## Status
- [ ] model.js + unit tests
- [ ] ui.js + expert.css (phone portrait)
- [ ] iPad portrait, landscape (iPad + phone)
- [ ] e2e expert.cjs + full suites
- [ ] compare screenshots
- [ ] mirror to fork
