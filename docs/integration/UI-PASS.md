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

## Drawer and toolbar follow-up — 2026-10-05

The user explicitly requested a Drawer button immediately before Archive in the
floating building bar. The existing MICE, optional Beat, and Archive controls
retain their styles, dimensions, and behavior. At 320px only inter-control spacing
is tightened to fit the additional button. A computed-style comparison with
`ef2daca` confirms the existing controls retain their styles at 1440, 768, 390,
and 320px. The outline has additional bottom space on narrow layouts so its last
drop target can scroll above the bar.

Drawer stores complete branches in the existing lossless branch envelope with
`storage: "drawer"`. Archive lists, counts, and Empty archive exclude those entries.
The saved data format, import/export, and account validator preserve the marker.
The drawer is nonmodal: native and pointer dragging can return a piece to a precise
outline slot. Put back restores its old position, falling back to the outer outline
if its parent is gone. Placement options are also available by clicking the handle.
Storage and return support Undo/Redo; invalid placement leaves the stored data
intact. Chronology keeps history and labels these records “In Drawer”; search
opens the drawer for stored results. Dragging onto Archive moves a stored piece
there without deleting its content.

The top toolbar now has a labelled Story tools disclosure containing settings,
pictures/references, structure review, colors, and text outline. Search, Undo/Redo,
and Save a copy remain direct controls; Tutorials uses a quieter text treatment.
Story view tabs occupy their own row. Opening the Drawer or starting a drag clears
a transient toast that would otherwise cover the drawer or a drop target.

Regression coverage is in `workshop/tests/drawer.test.cjs` and
`workshop/browser-tests/drawer.spec.js`, including nested data/history round trips,
invalid destinations, reload, Undo/Redo, archive isolation, native and touch-pointer
drag/drop, cancellation, keyboard placement, search, and 320–1440px layouts.
Visual captures: `/workspace/counterplot-qa/drawer/`.

Validation: `npm run check`, all 11 Workshop model test files, and all five server
test files pass. The final Drawer/story-view/UI browser run passed 68/68 checks
across desktop/mobile Chromium, Firefox, and WebKit. The wider regression run
passed 107/108; its Firefox historical-edit reload assertion passed on three
consecutive targeted repeats without a code change. The mobile Drawer failure
found earlier was fixed by reserving space beneath the outline and is covered by
the final passing run.
