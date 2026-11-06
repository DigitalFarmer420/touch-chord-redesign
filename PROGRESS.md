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

## rd5.1 (user bug: Expert / Simple -> Kids shows leftovers)
Trigger: a page that loaded or reloaded in Expert or Simple, then switched to Kids. Hello, Songs and Play were all visible
and stacked (3 gears, Hello's play disc / title / notes behind the pads, blank song chip and lyrics, no gold key).
Root cause (js/kids/view.js): build() made the three .kv-scr sections without `hidden`, and only show() hides them; enter()
called show() only at boot (`if (boot) show("hello")`), so a mode-switch entry in a page that never booted in Kids never
picked a screen; kv.screen stayed "hello" and paint() returned before filling the chip / lyrics / gold. Present since the
Kids view landed (779eec9); the e2e reloaded right after switching, so it never looked at that state.
Fix: the screens start hidden; every entry goes through show(): opening the app = Hello; a mode switch (Uiux rule) = the
kept song's play screen (song, key and step kept), else the song list, never Hello. The saved Kids song is kept on a switch
too (was boot-only, so it fell back to Twinkle). Guard in show(): play with no Kids song, a paint error or a blank chip goes
back to the song list. New e2e tests/e2e/modeswitch.cjs (360x780, 412x915, 780x360): reload in Kids / Expert / Simple, with
and without a song in progress, every ordered pair of switches; one Kids screen, one gear, landing rule, chip + lyrics +
one gold key on play, Kids view hidden in Expert / Simple. rd5 d1a3fef fails it (28 fails at 360x780). Badge v112.13-rd5.1.

## rd6 (user: one mode control; Uiux mockup touchchord-review/modes/mock.html; Noff rd5.1 Low + Info) - badge v112.13-rd6
- One mode chip in every mode, top right (Kids ★ / Simple ◐ / Expert ◆), replacing the Kids gear, Simple's gear menu and
  Simple toggle, and Expert's gold Expert button. It opens one Settings sheet (js/ui/modesheet.js, css/modesheet.css) with
  the same rows in every mode: Mode (3 segments + hints), Play along, Show hints, Chord numbers, Look, Upload a song
  (Expert only), How to & tour, Start over (2 s hold-to-erase confirm everywhere). The rows drive the app's own (now hidden)
  controls, so every old setting stays reachable. Kids: the chip opens only after a 1 s press-and-hold with a filling bar;
  a short tap shows "Grown-ups: hold 1 second". The click made by the lifting finger is ignored for 250 ms, so the sheet
  that opened under it does not close or act at once.
- Switching keeps song, key and step, closes the sheet and fades the new mode in; rd5.1 landing rule kept for Kids.
- No Simple toggle and no classic Full layout for users: old Full setups open in Expert (Expert pref set on), with a
  one-time dismissible note "Simple's dense layout lives in Expert now" (touchChord.notes.v1 {denseMoved:true}, saved when
  shown; never for fresh setups, saved Expert setups or ?expert=0/1). Saved Simple stays Simple; Simple has no Kids style
  chip and a saved Simple + Kids loads as Pop. Uploads: Expert plays the Full chart, Simple the easy one, one-chart songs
  play it in both (set on load, switch and reload; the pencil pick still works until the next switch).
- Look = Auto · Day · Lamp (js/ui/lookmath.js pure, js/ui/look.js runtime). Auto is the default for new / unset setups;
  saved Day / Lamp kept. Auto: Day 7:00-19:00 by the device clock, Lamp otherwise; checked every 15 s and on return to the
  page; at the boundary it waits until nothing is held / playing and 4 s since the last touch, then cross-fades (View
  Transitions, else a CSS fade). Kids and Expert; Simple shows the row disabled with a note (Simple Lamp = rd7).
- Expert Style menu scrolls the selected style fully into view when it opens.
- Noff Low: the Kids step is saved with the song (state.kidsWalk) and survives a reload (Kids step 3 -> Expert -> reload ->
  Kids at step 3). Noff Info: the play guard also checks lyrics (blank -> song list); kidsSongProblems() + unit test.
- Test-only hatches: ?test=1&classic=1 keeps the old classic screens (so audioeq / kvaudio / grownup replay 351c02c's taps);
  ?test=1&hour=H fixes Auto's hour. Neither is reachable without ?test=1.
- Tests: unit 98/98; e2e rd6 (new, 6 sizes); expert, kidsview x5, modeswitch x3 updated for the chip + hold; kvaudio and
  audioeq on the classic hatch (0 diffs vs 351c02c); audioeq REAL=1 (real Expert / Simple modes) cd19e41 vs rd6.
  grownup.cjs adapted, not a gate any more: B opens with ?classic=1, the top bar is hidden on both sides and the gear-menu
  shot is dropped (the menu is gone). Remaining diffs are only the style-chip strip in the top row at 780x360 (Full) and
  1024x768 (Simple), which reflows because the Simple toggle left that row; everything below is pixel-identical.

## rd7 (Noff rd6 SUMMARY.md findings + Uiux Low / Info) - badge v112.13-rd7
1. Med, Expert Start over: stops Play song, the loop and the Band (progStop + band.hush + stopPlayback) before the reset,
   as Kids / Simple do (Simple gets the same explicit stop before its reset).
2. Med, two-chart uploads: a switch Expert <-> Simple keeps the position by time. The bar the player is on is taken
   before the chart changes (progWalkAt, floored to the bar) and found again in the other chart (progWalkTo), the same
   mechanism 351c02c's Simple toggle used. Both charts share the form, so bar n is the same place in the song.
   Anh Da On Hon v1.3: Expert step 6 (bar 3) -> Simple step 6 (bar 3); Simple step 9 -> Expert step 9.
3. Med, v1.2 with a partial Full chart: js/songs/fullchart.js (pure, unit-tested) fills the Full version per section.
   A Full section that starts on the same beat as an easy section is played (the easy sections it spans are skipped),
   every other easy section is played as it is. A Full chart as long as the easy one is unchanged. Anh Da On Hon v1.2:
   Expert 71 steps / 62 bars (was 33 / 27), Simple 68 / 62.
4. Low, Kids: a reload in Kids still opens Hello; Start, or picking the same song card, resumes the saved step
   (kv.bootWalk). Another song starts at the beginning.
5. Low, the dense-layout note (Uiux spec): a toast just under the top bar, pointer-events none except its ✕, so taps
   reach Next and the other controls; it fades on the first tap anywhere or after 6 s; ✕ closes it.
6. Uiux Low: no Look row in Simple's sheet (no greyed control, no roadmap copy).
7. Uiux Low: the permanent "No more Simple on/off toggle..." footer is gone (the one-time toast already says it).
8. Uiux Info: Expert's "?" is the classic 44px circle with the same icon as Simple's.
Tests: unit + rd7.test.js; new e2e tests/e2e/rd7.cjs (360x780, 780x360; fails 27 checks on 38996e9, passes on rd7);
rd6.cjs updated for 6 / 7.

## rd8 (Noff rd7 SUMMARY.md Low findings + Uiux) - badge v112.13-rd8
1. Two-chart switch: the exact beat is kept (rd7 floored it to the bar), so the step that covers the current beat in the
   other chart is next: Expert Bb13 @ bar 3.5 -> Simple Bb @ 3.5 (rd7: Fm @ 3); Simple G7 @ 0.5 -> Expert G7#9 @ 0.5;
   v1.2 G7#9 @ 50.5 -> Simple G7 @ 50.5 (rd7: Eb @ 50). A Full chord with no easy chord on its beat lands on the easy
   chord covering it (Abmaj7 @ 21.5 -> Ab @ 21-23). The chord just played is never played again.
2. Dense-layout note: a one-line banner (30px) along the top edge of the chord panel (.next-card, inset 6px), copy
   "Dense layout is here now", ✕ on its right; pass-through and the 6 s / first-tap fade kept. Placed from the panel's
   rect (and on resize), so it never overlaps the top bar, Next or Play (checked at 360x780, 412x915, 780x360, 844x390,
   820x1180, 1180x820).
3. Partial Full chart: a later easy section with no Full section at its place reuses Full voicings. Rule: a Full
   section's origin is the easy section that starts on its beat and lasts one Full pass; an easy section reuses it when
   its chords (symbols, beats and repeat) equal that origin's. Same section type first, then any type (Anh's solo has the
   intro's chords -> the Full intro). The copy keeps the easy section's id, label, repeat and lyrics, so length and
   order never change; otherwise the easy section. Anh Da On Hon v1.2 Expert: 74 steps, Full chords all through
   (verse2a/2b/3 = Full verse, chorus2 = Full chorus, solo = Full intro), 62 bars.
4. Simple Lamp look: deferred to rd9 (decided with the user; rd8 ships items 1-3). The classic Simple screen is already a dark warm theme (close to the
   Lamp palette), so a real Auto / Day / Lamp in Simple means building a light Day theme for the classic screens
   (~170 hard-coded colours in base / topbar / strip / panels / keyboard / modes / dialogs css) plus contrast checks.
Tests: unit rd8.test.js (+ rd7 updated); e2e tests/e2e/rd8.cjs; rd6 / rd7 updated for the new copy / place.

## rd9 (Noff rd8 SUMMARY.md + Uiux/Noff steering) - badge v112.13-rd9
1. Medium (rd8 regression): in a reused Full section (Anh v1.2 verse2a, verse2b, chorus2, solo, verse3) the lyric
   markers follow the section's own beats: offsets are taken inside the section (easy chord -> its beat -> the Full
   chord covering that beat), not from the donor section's absolute positions, so they no longer pile onto the last
   chord. Lines with two markers keep both. Sections that are not reused keep rd7's mapping. verse2a markers are now
   0 | 1,2 | 3,4,5 | 6 | 7 (= the easy chart); each Expert step shows the line Simple shows at the same beat.
2. Low: a switch at the song's end stays at the end (Expert 74/74 -> Simple 68/68 -> Expert 74/74). The stale "last
   step" index past the shorter chart is cleared, so songbar's TypeError 'si' is gone.
3. Low: round trips are idempotent. The beat a switch came from is reused when the player has not moved since
   (and is not playing), so Abmaj7 @21.5 -> Simple Ab @21 -> Expert Abmaj7 (rd8: Gm7 @21). Every Expert step (74) ->
   Simple -> Expert and every Simple step (68) -> Expert -> Simple comes back to itself (v1.3).
4. Dense-layout banner (Uiux + Noff steering): no ✕ at all. The whole banner is pointer-events:none, has no
   interactive element, and fades after 6 s or on the first tap anywhere, which still reaches the control underneath.
   It sits on the chord panel's top edge, ending 6px left of any chip in its strip (full panel width if that leaves
   under 180px), 30px tall, 28px ("slim") when the viewport is under 400px tall. Never on the top bar, Next or Play,
   no chip covered at 360x780, 412x915, 780x360, 844x390, 820x1180, 1180x820.
5. Simple Day / Lamp look: moved to rd10.
Tests: unit rd9.test.js; e2e tests/e2e/rd9.cjs (lyrics vs beats, end of song, all round trips, banner geometry and a
tap through it plays the chip); rd6 / rd7 / rd8 banner checks updated for no ✕.

## rd15 (short landscape: keys get their height back; one-height top bar) - badge v112.13-rd15
1. Noff Med: at 780x360 in Expert Buttons rd14's 24px header strip left 17px rows (6px gaps). Uiux's design: phones held
   sideways (lay-phone-land: 780x360, 844x390, 915x412, 740x360) have no keyboard header strip; the Keys chip is a
   full-width "↻ <view>" button in the right-hand column under Full Range / Sound (SUSTAIN 46 -> 40px and Type 40 -> 36px
   pay for it, so the column still ends with the chord grid; SUSTAIN keeps a 44px tap area through an invisible ring; Full Range / Sound / Keys 28px at 360px tall, 32px taller);
   the enable-sound pill floats over the keys again (pointer-events: none: a tap on it presses and sounds the key under
   it, and that first tap enables sound); Buttons row gaps 2px. Buttons rows: 25.5px at every short-landscape size
   (rd14 16.5, rd13 21.5); Octave / Full keys 67px (rd14 52). Key labels are clipped to their keys (Buttons). Upright
   phones and iPad keep rd14's strip exactly. While the Type table is open in short landscape the column has no room for
   the Keys button (Settings > Keys still switches).
2. Uiux Low: the short-landscape Expert top bar is one height, 36px (Key, Style, the Song | Progressions track, ◆ Expert,
   and "?" drawn at 36px with an invisible 44px tap ring that stops at ◆ Expert's edge). The equal-height audit now also
   runs at 780x360, 844x390, 915x412 for Kids / Simple / Expert, Day and Lamp; rows it found and fixed: Expert top bar
   (32/32/36/36/44 -> 36); Expert Now card 30 -> 32 (= song bar, Next, Play); Simple mode chip 40 -> 44 (= Style row, ?);
   Kids mode chip 52 -> 60 (= Home, song line, Happy / Sad); Kids Play 88 -> 96 (= Next). Audit rule changes (not fixes):
   a control behind an open sheet's dim layer is not in a row with the sheet's controls (Kids chip vs the sheet's close
   button), and Simple's song strip (#songBar, no tap action in Simple) is not a control.
Tests: tests/e2e/rd15.cjs (the above at the 4 short-landscape sizes x 3 views x Day / Lamp, with RD14=<5517105> for the
key heights; upright / iPad boxes = rd14; eqh in short landscape). rd14.cjs's strip checks apply off short landscape.

## rd14 (Keys chip off the keys; Song | Progressions track 44px) - badge v112.13-rd14
1. Med (Noff + Uiux): the rd13 Keys chip sat on the keys (780x360 Buttons: all of the top-right Ab; upright: its top
   third; landscape: the top of B / top C) and took their taps, and crowded the enable-sound pill. Expert's keyboard
   panel now has a header strip (28px upright phones, 24px short landscape, 32px iPad) with the chip at its right end
   and the pill at its left; the panel keeps its height (the keys start lower; the chord grid and pads do not move).
   Found by the new hit test: in short landscape Buttons a key's note label overhung the key above and took its taps
   (rd13 too); labels no longer take taps in Expert.
2. Uiux: the Song | Progressions track is 44px outside (38px segments, 3px padding), exactly as Next / Play; the eqh
   audit measures outer boxes (outline included) and treats the track (.x-seg) as one control.
3. Accepted as-is: a held key's note stops when the Keys view changes (Noff Low); Start over resets Keys to Octave.
Tests: tests/e2e/rd14.cjs (every key, 5x5 points 5px in, hit-tests to the key at 360x780, 384x832, 412x915, 780x360,
1180x820 x Octave / Full / Buttons x Day / Lamp; chip in the strip, clear of the pill; panel + grid = rd13; track).
rd10-rd12 pixel checks also mask Expert's keyboard panel; rd13's chip position check follows the strip.

## rd13 (Expert Keys switch + equal-height rows on phones) - badge v112.13-rd13
1. Why Expert showed buttons: Expert draws the saved keyboard layout (touchChord.settings.v1 "layout"). "fourths" (the
   4x6 note-button grid) is restored from a setup that picked Fourths in the old Layout segment (classic Full screen,
   or Expert's Sound > Layout tab, labelled "Fourths"), and Expert had no visible switch for it.
2. Keys: Settings row "Keys" (Octave / Full / Buttons), first under Playing, Expert only; a chip on the play panel's
   top-right corner shows the pick and one tap moves to the next. One pick per device = the saved layout (octave /
   piano = Octave, full = Full, fourths = Buttons; nothing saved = Octave), so it survives reloads and mode switches;
   Kids and Simple keep their one-octave keys. The Sound > Layout tab sets the same pick. The panel keeps its grid
   row (same height in all three). Sound is unchanged (a chord sounds the same notes in every view).
   Fix found by the new test: Expert's Octave window draws 12 keys (C..B) but slid as if it had 13, so a chord moved
   to the window's top edge had its top note one key past the drawn keys (dark). The slide now uses the drawn span.
3. Equal heights (Galaxy S25 upright; 360x780, 384x832, 412x915; Kids, Simple, Expert; Day and Lamp; every screen,
   sheet and panel in tests/e2e/eqh-states.cjs): rows fixed - Expert top bar (Key / Style 38 -> 44 = Expert chip / ?),
   Expert row 2 (Next / Play 38 -> 44 = Song | Progressions), Expert row 3 (progression picker 38 -> 60 = Now card),
   Simple top bar (mode chip 40 -> 44 = ?). Kids had none. Phones held upright only (lay-phone-port).
Tests: tests/e2e/rd13.cjs (Keys row / chip / cycle / persistence / defaults / panel height / slide + snap-back /
root-left / same sound / Kids + Simple untouched; equal heights 144 screens, eqh-lib.cjs); rd6 expects the Keys row.

## rd12 (Uiux Low: tablet lyric size) - badge v112.13-rd12
1. Simple's lyric rows on iPad (lay-pad-port / lay-pad-land) were 14px on 18px rows: now 16px on 22px rows (the
   2-3 row block grows 12px, the rd11 section chip follows the row height). The medium tablet size (600-767px wide,
   e.g. iPad mini 744x1133, laid out as phone-port) had the 11px one-line song bar: now 16px, bar 26px. Day and Lamp alike.
2. Expert's lyric line was already 22px (pad landscape) / 26px (pad portrait) / 16px (medium) - unchanged, now tested.
3. Song title and its truncation unchanged (rect / font / ellipsis equal to rd11). Phones (sz-compact: 360x780,
   780x360, 412x915) pixel-identical to rd11; the ?classic=1 hatch unchanged (grownup, audioeq).
Tests: tests/e2e/rd12.cjs (8 tablet sizes x Simple/Expert x Day/Lamp >= 16px, not clipped, title = rd11; phones x
Simple/Expert x Day/Lamp = rd11 pixels, RD11 env). rd10.cjs / rd11.cjs: on iPad sizes the Lamp pixel check now
compares the start screen only (the song screen moved below the taller lyric block on purpose).

## rd11 (Uiux Lows on Simple Day) - badge v112.13-rd11
1. Look helper line in Simple: it was already there in rd10 ("Auto: Day 7:00–19:00, Lamp at night", shown only while
   Auto is picked, the one modesheet.js rule for all three sheets); the rd10 sheet shots had Day picked. Now tested in
   all three sheets: same words, 12px / 600 / rgb(122,106,92); the face follows each sheet (Kids sheet Fredoka,
   Simple = Expert Nunito). compare-rd11 sheet shot is at Auto.
2. Tension chips (Bbsus4, and m7b5 / 7b9 sharing the colour) in Day: mid plum #5E3A66, edge #4A2B52, white text
   (9.2:1). Minor in Day is #6A5A9A (lum .127 vs plum .064, hue 255 vs 289). Lamp keeps navy #2A1F45.
3. iPad lyric rows (lay-pad-port / lay-pad-land, 2-3 rows): the section chip was centred beside the rows in Day and
   Lamp alike, so both now top-align it to the first line (one row tall, same centre as line 1). Phone layouts and
   the ?classic=1 hatch are unchanged. Lamp therefore differs from rd10 only in the song bar on iPad.
4. Contrast run at 820x1180 and 1180x820 (Day: 0 below AA / 3:1). Lamp still has the inherited 351c02c failures.
Tests: tests/e2e/rd11.cjs (helper line x3, sus chip Day / Lamp, chip alignment at 820x1180, 1180x820, 768x1024,
1024x768 + phone unchanged, contrast, Lamp = rd10 outside the song bar); rd10.cjs masks the song bar on iPad sizes.

## rd10 (Noff rd9 SUMMARY.md Low + Simple Day look) - badge v112.13-rd10
1. Lyrics of a repeated Full section, per pass. The v1.2 Anh file is ambiguous: its one Full verse (repeat 2) lists
   all 27 verse lines of the song (verse1a, 1b, 2a, 2b, 3) on chords 0-7 with no pass, so Expert steps 17-23 showed
   pass 1's lines again. Now each pass of a repeated Full section takes the lines of the easy sections that tile its
   bars (markers moved to the Full chord at their beat; `passLyrics`, read by the song bar, two-row lyrics and the
   Expert song line through `secLyrics(sec, rep)`). The saved answer is unchanged; a pass the easy chart does not
   tile exactly keeps the section's own lines. Every Expert step of v1.2 and v1.3 shows Simple's line at its beat.
2. Simple's Look (Auto · Day · Lamp, Auto by default, same 7:00-19:00 clock rule and pause-before-switch as Kids /
   Expert; saved in touchChord.simpleLook.v1). Lamp = the classic dark screen, pixel-identical to rd9. The classic
   screens' hard-coded colours are CSS variables now (css/base.css --lk-*, + --copper-t / --copper-b / --sea-t for
   the accent as text / edge); css/simpleday.css (html.s-day, only while Simple is the mode, never with ?classic=1)
   redefines them: cream #F6EFE3 / white surfaces, warm ink #2B2118, chord colours as in Lamp (minor chips a shade
   deeper for AA), 3:1 edges on chips, note row, pads, buttons, the mode chip and the sheet's groups / switches.
   The Look row is back in Simple's sheet.
3. Contrast (rd10 suite): Simple Day has no text under AA and no control under 3:1 on chips, the note row / pads,
   lyrics + song bar, controls, step badges and the sheet (360x780, 780x360, 820x1180). Lamp keeps 351c02c's values
   (some below: minor-chip text 4.1:1, dark button edges ~1.5:1); changing them would break Lamp = classic.
Tests: unit rd10.test.js; e2e tests/e2e/rd10.cjs; rd6 / rd7 updated for Simple's Look row.

## rd17 (one home per control) - development only, badge v112.13-rd17
No production promote, no APK. Base redesign-dev d10aecf (rd16).

1. Expert upright phones and iPad: the keyboard header holds "Type: Auto ▾" on the left and the Keys cycle on the right. Type keeps tap-open / fold and the 0.3 s hold-to-peek, and the live modifier label. Both are drawn in the 40px strip and keep a 44px hit area that reaches up into the gap, not down onto the keys. The enable-sound pill floats over the keys (pointer-events none); the first tap enables sound and plays the key under it once. Above the keyboard, SUSTAIN, All notes and Sound are three equal buttons; labels do not wrap at 360 / 384 / 412.
2. Short phone landscape: Type and Keys are half-width buttons in the existing right-hand column (All notes | Sound, then Type | Keys) and stay when the type table is open. At 800x330 the column rows stay at least 32px and the keys give up a little height so the labels do not crush. The half-width Keys button reads "↻ Octave" (the "Keys: …" prefix clipped the name). iPad keeps its column (SUSTAIN, then All notes | Sound); Type and Keys are in the keyboard bar.
3. User-facing Keys names: Octave / Keyboard / Buttons. Saved values stay octave / full / fourths. The keyboard cycle is the only home. The Sound Layout tab is hidden (the classic ?classic=1 hatch still shows it). The Settings Keys row is gone. Start over resets to Octave. Sound subtitle is "FX · Loop". Sound sheet Voicing and Band use Expert ink with space under the tiles so they are not clipped at 360.
4. Full Range is "All notes", with "in key only" / "all 12". It still only unlocks off-scale keys. Sound is unchanged.
5. Lock is editable only on the song strip. My songs shows a read-only Lock line. Simple and Expert "?" open How to / Tour. Kids keeps Settings How to & tour. Settings has no Upload row; Expert Song opens My songs. The easy/full chart toggle is the read-only line "Plays the easy chart in Simple, the full one in Expert."
6. Kids song list fills the width (2 columns on phones upright, 3 on landscape and iPad). Six songs stay at the usual card height. A longer list (tested with clones of the real cards, not new songs) shows whole rows plus a peek of the next row. Picture and title sizes stay put.
7. How to / tour copy no longer says gear menu, Layout tab, the old upload button, or "6 songs". Badge v112.13-rd17.

Music: sliding piano, tonic snap-back, root-lowest voicing, left-to-right pitch, no octave folding. No audio change. Kids six songs, Simple Play along, mode and sound unlock kept. Noff pack not in this change.

### Test ledger (development, this tree)
Commands use `CHROME=/usr/local/bin/google-chrome`. Reference servers were git worktrees: 351c02c :8090, rd9 f0cebc4 :8091, rd10 e8cf905 :8092, rd11 aaff6c8 :8093, rd13 b640237 :8094, rd14 5517105 :8095, rd16 d10aecf :8096.

- Unit `node --test tests/unit/*.test.js`: 112/112 PASS (includes tests/unit/rd17.test.js).
- `node tests/e2e/run.cjs` PORT=8088 with RD9/RD10/RD11/RD13/RD14 set, 108.6 min, 25/41 PASS. Then re-checked the two files that changed after that run.
- PASS in that run: lyrfit111, kbaccept 360/780 octave and full (4), kidsview 360/780/768/1024/820 (5), kvaudio, expert (422s), modeswitch 360/412/780 (3), rd6, rd7, rd8, rd9, rd10, rd11, rd13, rd14, rd15, rd17.
- rd17 e2e re-run after the classic-hatch fix below: PASS (same sizes).
- howto112: the suite crashed on a hidden `#uploadBtn` click. Re-run after opening that form with `element.click()` (the button is no longer on screen): 0 fails PASS.
- rd12: suite 6 fails. Re-run after masking/clipping the upright Expert control row (changed on purpose): 2 fails, both `744x1133` simple lyric clip. The same clip is on rd16 (`scrollHeight 20` vs `clientHeight 18` on both). Not an rd17 change. Phone expert pixels above that row match rd11.
- audioeq `audioeq.cjs` classic hatch, 351c02c vs this tree: 64 runs, 4268 calls, 0 differences.
- grownup `grownup.cjs 360x780` vs 351c02c: 4/14 identical (the two Simple setups). The other 10 differ only by the classic button reading All notes instead of Full Range. A first cut had also parked Type inside the classic keyboard and pushed the keys down; Type now stays in the hidden Expert controls unless Expert is on, and the keys/pill line up with 351c02c again.
- Pre-existing on rd16 d10aecf, same failure shape, not changed here: tour112 (gear `#configBtn` hidden), hints112 and hints1121, test111, keysplit, validate (hidden classic controls), labelfit (50), kbfix (91, same count on rd16), kidsascend (0 classic kid pads), kidsgold, playoff (2: kids gold pad not shown), upload13 (hidden `#uploadBtn`). These suites assume the classic chrome that Expert replaced in earlier redesign rounds.
