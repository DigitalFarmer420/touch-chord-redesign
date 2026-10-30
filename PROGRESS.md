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
- [x] model.js + unit tests (tests/unit/expert.test.js: 17 tests; unit total 87/87)
- [x] ui.js + expert.css: phone portrait, iPad portrait, iPad landscape, phone landscape
- [x] e2e tests/e2e/expert.cjs (4 sizes, 324 checks, 0 fails) + added to run.cjs
- [x] grid marks in Expert colours (sounding chord = gold, next = dashed teal; Play along off still hides next marks)
- [x] compare screenshots in /workspace/chord-touch/expertredesign/compare (build-<size>/ scenes + compare-*.png mockup vs build composites)
- [x] full e2e suite at ca944e7 on Node 24.22.1: smoke 21/21 passed in 67.9 min (CHROME=/usr/bin/google-chrome, PORT=8291). Unit 87/87.
- [x] mirror to fork (/workspace/touch-chord-redesign-fork, remote expertsrc, branch expert-build only)

## Box restore (2026-10-30 ~02:55 PT)
- Node is now v24.22.1. The node_modules symlink target (v13/repo/node_modules) was gone, so `npm ci` was run here (real node_modules, git-ignored).
- Node 24: `node --test tests/unit/` (the package.json test:unit script) fails because a directory is not a test file; run
  `node --test tests/unit/*.test.js` instead (87/87 pass). package.json left unchanged (pre-existing, also on main).

## Notes / deviations (for the report)
- Type bar at rest reads "Auto" (a key plays its own chord in the key: kb-fix rule); the mockup says "Major".
- The key window still follows a played chip / Next chord and snaps back to the key's tonic (classic kb-fix behaviour), so it rests at C..B in C major, G..F# in G major.
- Expert is opt-in (mode switch or ?expert=1); the classic Full screen stays the default for "not Kids, not Simple" so the existing suites run unchanged.
- Sound sheet keeps the app's 6 voices and the 5-step voicing slider (mockup: 8 voices, 4 voicing buttons) - no audio change.
- Hold-peek on the Type bar opens the table while held; playing a type needs a second finger (no slide-onto-type gesture).
- Picking Kids in the style drop-down switches to Kids mode. No Auto-key toggle in the key sheet. Phone landscape (780x360) has no mockup: own layout.
- No version bump (still v112.13) to keep the diff small.
- Likely merge conflicts with kids-build: js/ui/pads.js (renderKeys + setWinKeys), js/main.js (import/boot), index.html (css link), tests/e2e/run.cjs (suite list). gear.js / settings.js are NOT edited (the gear mode switch is injected by js/expert/ui.js).
