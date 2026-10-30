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

# redesign-dev (merge of expert-build 451134c + kids-build 744876f) - dev instance only
Working copy /workspace/chord-touch/redesigndev/repo, branch redesign-dev (from expert-build, kids-build merged with --no-ff).
Deploy target: NEW repo DigitalFarmer420/touch-chord-redesign (GitHub Pages from redesign-dev, root) -
https://digitalfarmer420.github.io/touch-chord-redesign/ . Never touch-chord (production) or touch-chord-dev.

## Merge conflicts and resolutions
- index.html: both added a stylesheet after fit.css -> kids.css then expert.css (both scoped: html.kv / html.expert).
- js/main.js: both added an import -> both kept; kidsView.boot() inside the boot (as in kids-build), expertUi.boot() at the end (as in expert-build).
- tests/e2e/run.cjs: both extended the suite list -> upload13, kidsview x4, kvaudio, expert (kids-build's run.cjs fix, mtime >= start, kept).
- js/ui/pads.js: merged cleanly (kids-build moved the touch path to js/ui/touch.js; the Expert setWinKeys hook in renderKeys stays).
- Mode switch (both builds had one): ONE Kids / Simple / Expert switch. Kids = the Kids view (kids-build; settings
  `expert: false`), Simple = the classic Simple, Expert = the Expert screen (touchChord.expert.v1 on). The classic full
  app (old saved setups) lights no button. Same switch in the gear menu (#modeRow, replaces kids-build's #expertBtn
  "Expert mode" row), in the Expert settings sheet and in the Kids view settings sheet; all go through js/expert/ui.js setMode
  (the Kids view gets it through kids/view.js setModeHandler, so kids/view.js does not import the Expert code).
- Start: first visit = the Kids view; old saved setups = the classic full app; ?expert=1 = Expert (also on a first visit; boot-early skips html.kv).
- REDESIGN DEV badge (index.html, "REDESIGN DEV · v112.13-rd1", noindex, title prefix); grownup.cjs hides it and #modeRow for the 351c02c pixel compare.

## Status
- [x] merge + one mode switch + badge; unit 90/90 (node --test tests/unit/*.test.js)
- [x] e2e group 1 at 4610bf0 (worktree ../wt): 19/19 PASS in 26.5 min - howto112, tour112, lyrfit111, hints112 x2, hints1121 x2,
      keysplit, validate, labelfit, kidsascend, kidsgold, upload13, kidsview x4 (360/780/768/1024), kvaudio, expert (328 checks)
- [ ] e2e group 2 (worktree ../wt2): test111, kbfix, kbaccept-360 x2 PASS so far; kbaccept-780 x2, playoff running
- [ ] grownup (pixel compare vs 351c02c) + audioeq (audio calls vs 351c02c): run-ga.sh, logs ../logs
- [ ] new repo + Pages + live check
