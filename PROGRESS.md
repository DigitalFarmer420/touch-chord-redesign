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
- [x] e2e group 2 (worktree ../wt2): 7/7 PASS in 46.7 min - test111, kbfix, kbaccept x4, playoff
- [x] audioeq vs 351c02c: 64 runs, 4268 audio-engine calls, 0 differences (sound / timing identical)
- [x] grownup vs 351c02c: first run 81/84 identical (3 'menu' shots at 768x1024 / 1024x768 differ only in whether the
      walked Am chord is still lit when the gear menu opens - timing under load, the set changes run to run);
      reruns at quiet load: 1024x768 21/21, 768x1024 21/21 (360x780 and 780x360 were 42/42 in the first run)
- [x] new repo DigitalFarmer420/touch-chord-redesign (public, default branch redesign-dev, Pages from redesign-dev /): https://digitalfarmer420.github.io/touch-chord-redesign/ serves REDESIGN DEV · v112.13-rd1; headless 360x780 (DPR 3, mobile): first visit = Kids view, ?expert=1 = Expert, 0 console errors, 0 failed requests

## rd2 (Uiux rd1 review + Noff rd1 Low) - local until the suites pass
1. Kids iPad portrait: piano fills down from Play / Next (820x1180: gap 268 -> 16px, white keys 107x660; 768x1024 gap 112 -> 16).
2. Kids lyrics: current line dark ink, upcoming words #6E5A46 (6.5:1), next line muted (4.7:1), no see-through opacity; current word on gold.
3. Expert step badges keep off other chips (playback.js setBadgeAvoid hook, only set by Expert; classic placement unchanged).
4. Expert Sound caption 10px (phone landscape / iPad); dropped on phone portrait (does not fit at 10px).
5. Expert keys: one mark each - solid gold = sounding, teal dashed = next and not sounding; classic copper next-box off in Expert.
6. Dev badge: tiny bottom-right pill in landscape (phone + iPad); v112.13-rd2.
7. Noff: a finger down before a mode switch does not act on the new screen on lift (its click is dropped, the old hold still released).
e2e: kidsview (gap, iPad-portrait key height, lyric contrast, stale lift; + 820x1180), expert (key marks, 344 checks).
Compare: /workspace/chord-touch/redesigndev/compare-rd2/
rd2 tests (a872db7): unit 90/90; kidsview x5 (360/780/768/1024/820) PASS, kvaudio PASS, expert 344 checks PASS;
grownup vs 351c02c 84/84 identical (menu shot now waits for the walked chord to finish); audioeq vs 351c02c 64 runs / 4268 calls, 0 differences.

## rd3 (Noff rd2 report + steering a/b/c)
1. MED Expert marks by pitch class (js/expert/ui.js markPlan/paintMarks, css/expert.css x-pclit / x-pcnx / x-up / x-down):
   a sounding (gold) or next (teal) note outside the 12-key window lights its same-name key with a small up / down arrow
   (hold G = G, B gold + D gold up; Jazz G7 = F gold up; next Dm7 = C teal up). Visual only; suggestPreview keeps `raw`
   (the true sounding notes) beside the window-mapped `midis`. 7 white keys kept.
2. LOW mode-switch guard: no time window. A pre-switch pointer's up / cancel releases its hold; only a click carrying that
   same pointerId is dropped (cleared on the next pointerdown of that id). Clicks with no / negative pointer id always pass.
3. LOW Kids black keys: root cause - Kids view enter() rebuilds the hidden twin pads with renderPads(), which (unlike
   kbRebuild) does not run paintKeyChip, so the twins lack "nokey" until the first tap repaints them: the first out-of-key
   tap read as playable (C# / Bb major). Fix: the Kids view key decides out-of-key from the key itself (keyOutOfKey).
   351c02c Kids style: black keys painted nokey on load, all silent (first and later taps) - no bug there.
(b) Labels: every key's label = the note name of its pitch at rest (C..B, 60-71), while a chord holds (window follows,
   e.g. G = D4..C#5 labelled D..C, C#), after snap-back and in playback. Noff's D4-C5 = the window following the chord. No fix needed; e2e added.
Badge v112.13-rd3. e2e: expert section 14 (8 styles), kidsview 11 (slide + keyboard / synthetic Next) and 12 (black keys).

## rd4 (Noff rd3 MED + Uiux rd3 LOW; steering: remove, not route)
1. Kids is no longer in Expert's Style list (model.js STYLE_MENU, 8 styles); the Kids / Simple / Expert switch is the only way
   into Kids; the classic style chips keep Kids. A saved Expert setup with style Kids loads as Pop in Expert (modeOf: pref on =
   expert; expertStyleFix -> paintMode clicks Pop). e2e: no Kids in the list, chips keep Kids, saved Kids + Expert -> Pop (with
   and without ?expert=1), no page errors.
2. The play-along hint (hints.js setHintAvoid hook, Expert only) keeps clear of every Expert block (top bar, toggle, Next/Play,
   source bar + dots, Now, controls, keys, step badges); inside the chord grid only in empty space, 8px clear of its border.
   e2e: hint after a wrong chip covers nothing, at the 4 Expert sizes. Classic placement unchanged.
3. Key window (moving / snap-back) untouched. Badge v112.13-rd4.
Tests: unit 90/90; kidsview x5 PASS; kvaudio PASS; expert 1516 checks / 0 fails; grownup 84/84 (768x1024 walk3 timing flake
in the loaded run - B still showed the walked Am - re-run twice 21/21); audioeq 64 runs / 4268 calls / 0 differences.

## rd5 (Uiux LOW, landscape phone Style list)
Landscape phone only (html.lay-phone-land): the open Style list grows into the space below (8px safe margin; js/expert/ui.js
fitStyleMenu). It shows every row that fits; if it still scrolls, it stops half way through a row and fades at the bottom
(.x-more, removed at the end of the list). 780x360 and 844x390: 6 full rows + half of Yoga (rd4: 3 and 4 rows). Portrait and
iPad unchanged (all 8 rows). e2e: expert "style list" block at 780x360, 844x390 (+ 390x844, 360x780, 820x1180, 1180x820).
Key window untouched. Badge v112.13-rd5.
Tests: unit 90/90; kidsview x5 PASS; kvaudio PASS; expert 1552 / 0 fails; grownup 84/84 (768x1024 screenshot timeout and a
1024x768 one-chip pixel diff under box load in the parallel run; both re-run alone 21/21); audioeq 64 runs / 4268 calls / 0 diffs.
