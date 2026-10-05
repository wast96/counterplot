# Workshop UI review — 2026-10-05

Follow-up: [Sequence, Chronology, and Choices](STORY-VIEWS.md) adds closing moments
and distinct layouts for these three views.
The former Drafts panel is now [Archive → Unfinished edits](UNFINISHED-EDITS.md).

This follow-up improves the Workshop's layout and information grouping while
keeping existing project/account data formats. The user explicitly requires the
floating MICE / Beat / Archive bar to retain its appearance, position, and behavior.
Do not restyle, relocate, or hide that bar in future UI cleanup without a new
explicit request from the user.

## Changes

- Story views use flat, underlined tabs, separate from story actions. Tabs expose
  selection to assistive technology and support arrow, Home, and End keys.
- On phones, secondary story actions remain available in Story tools. Header
  actions, breadcrumbs, filters, and tab labels fit without text collisions.
- Character life status and cast prominence sit with the character's name and
  edit control. They reflect the selected historical moment, which is labeled.
  Arrange cast sits beside New character. Counts explicitly say block changes.
- Outline threads and beats show linked world entries beside plot/character tags.
  Entries open for editing, and renaming propagates to all linked cards.
  “+ Add someone” always follows the last character, including populated cards.
- Deeply nested narrow cards give titles their own row; long linked names wrap.
  Choices, Sequence, Chronology, and Shared stakes have consistent content gutters.
- Narrow dialogs separate utility controls from headings. Account sign-in,
  registration, and recovery links wrap and avoid a redundant active-mode button.
- Secondary labels are more readable, the Write heading matches the view, and
  project versions replace the misleading LOCAL WORKSHOP subtitle.
- The first-story hint is an inline outline tip, limited to the initial example
  story. It no longer floats over unrelated views or imported projects.

## Verification

- Reviewed captures of 13 views at 1440, 768, 390, and 320 pixels, plus six dialogs
  at desktop and narrow widths. Stress cases include eight nesting levels and
  long/unbroken names. This is representative coverage, not a proof against every
  possible story, browser configuration, or content combination.
- Build consistency and syntax checks passed. All nine Workshop Node test files
  passed. Both complete desktop and mobile tutorial walkthroughs passed (22
  stages, 41 actions each), along with 15 responsive tutorial breakpoints.
- The complete Playwright suite passed 60 tests across desktop Chromium, mobile
  Chromium, Firefox, and WebKit. After the final inline-tip spacing correction,
  all 24 focused UI tests passed again across those same four projects.
- New regression checks exercise world-link edits/reload persistence, adding cast
  to populated cards, historical character status, keyboard tabs, account recovery,
  dialog bounds, deep nesting, long tags, and text fitting within tab hit targets.
- Existing browser tests now wait for app readiness before using hidden import
  inputs or choosing desktop/mobile tool controls, avoiding startup timing races.
- Compared computed styles and dimensions for the floating bar and every descendant
  against the published integration at 1440, 768, 390, and 320 pixels: identical.
  Its rendering conditions and markup are unchanged.
- Automated WCAG A/AA checks on Outline, Read, Characters, and World at desktop and
  mobile sizes found only contrast findings in the explicitly protected original
  floating bar. This is not a full screen-reader or physical-device certification.

Evidence is in the execution workspace at `/workspace/counterplot-qa/ui-pass/`.
Browser regressions are committed under `workshop/browser-tests/ui.spec.js`.
Final generated `index.html` SHA-256:
`ad590edaed3f64024fe89605bc009668f1a61ebcb67e0e17fd94b6f9d82af6e1`.
