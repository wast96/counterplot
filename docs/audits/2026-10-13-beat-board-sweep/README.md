# Beat boards, story fields, and renewed workspace audit

This pass starts from deployed PR #24. The earlier historical-moment cleanup remains in place. Character previews intentionally continue to follow Chronology, as requested. All tests use synthetic stories and isolated browser storage; no production manuscript was edited.

## Delivered behavior

- **Beat board** is the fifth tab. Each thread opening, thread closing, and outline beat has its own beginning, ordered small-moment cards, and ending. Cards support insertion, deletion, drag handles, earlier/later buttons, Alt+arrow movement, undo, reload, archive/restore, and backup round trips. Closing boards remain separate from opening boards. Existing scene entry/exit/internal-beat notes become board content.
- **Match outline** appears in both Chronology and Sequence. Each resets its own complete view independently, including nested closings, with one-step Undo. Chronology moves whole event records, preserving dates, changes, and standalone historical anchors. Matching from date grouping returns to story-order display.
- Pill-shaped planning controls are called **story fields**. Every beat gains **Development**. **Edit fields** adds, edits, or removes custom fields and hides/restores default fields independently on each opening/closing/beat. Hiding character fields preserves their recorded history. Custom fields survive backups and Markdown export. Unfinished field forms can be resumed from Archive after reload.

## Confirmed defects corrected during the renewed sweep

| Defect | Correction | Verification |
| --- | --- | --- |
| Refine's inspector recorded new changes at the opening while viewing a closing. | Use the selected Refine edge, including after returning from a Beat board. | Browser regression asserts the actual saved history record's timing. |
| A cloud-sync failure still showed a healthy checkmark and lacked a direct recovery action. | Display an attention indicator and **Review sync issue**, opening the existing explanation and retry controls. Healthy status stays informational. | Simulated HTTP 503, continued local editing, explanation, successful retry, and retained data. |
| Newly gained character blocks could not receive a custom label in their form. | Add an optional label, retain it when editing, and recover new-block drafts correctly. | Save/reload regression and gained-block form accessibility scans. |
| Very long unbroken state text overflowed the inspector; some tool buttons clipped. | Wrap the text and tool labels while retaining icons. | Long-text inspector regression and layout matrix. |
| Move-piece shortcuts extended outside a narrow dialog. | Allow the shortcut row and its button labels to wrap. | 320×568 and desktop dialog geometry/focus checks. |
| Continuity comparison regions could scroll but were unreachable by keyboard. | Label both comparison regions and include them in keyboard navigation. | Axe and repeated Tab navigation on both screen sizes. |
| The gained-block “before” preview had insufficient text contrast. | Use a darker existing-style text color. | Both gained-block dialog Axe scans pass. |
| A transient save toast could cover Story tools on a short screen. | Suppress its overlay while Story tools or Account menus are open. | Text-outline action is reachable immediately after importing on a 320×568 viewport. |
| Refine/board moment navigation could lose its scroll position on rerender. | Preserve its horizontal and vertical scroll with the existing navigation strips. | Board interaction suite and responsive navigation checks. |

## Inventory and coverage

The nine audited views are Outline, Chronology, Sequence, Refine, Beat board, Characters, World, Connections, and Archive.

- **108 main layouts:** normal and deliberately long-text fixtures × nine views × widths 320, 390, 768, 1024, 1440, and 1920px.
- **72 additional layouts:** empty and dense stories × nine views × 320×568, 640×450, 768×600, and 1440×900. Dense stories add 70 pieces and 20 characters.
- **60 core dialog configurations:** story shelf; character creation/editing; block library/editor; World creation/editing; connection creation/editing; export; account login; plots; recorded changes; character states; search.
- **40 additional workflow configurations:** story settings, text outline, structure review, references, reference creation, plot editing/roles/creation, portraits, block movement, scene craft route, continuity, piece history, usage links, thread links, piece movement, opening/beat/closing fields, and gained blocks. Scene craft correctly routes to Refine; the other 38 cases are dialogs.
- **95 matrix Axe scans:** 18 populated views, nine empty views, 30 core dialogs, and 38 additional dialogs. Scans use WCAG 2 A/AA, 2.1 AA, and 2.2 AA tags. New feature tests also scan boards and field editors.
- Regression suite additionally exercises state forks, later blocks and archived origins, outline movement, independent chronology/reading order, bulk edits, filters, keyboard tabs, references, storage errors, unfinished forms, tutorial isolation, private account recovery, and import/export.

Intentional horizontal scrolling in tabs, cast, character history, and moment navigation is distinguished from page overflow. The geometry scripts report those offscreen descendants so they can be reviewed; they are not automatically classified as defects. The portrait's small overlapping badge is intentional. Full-page overflow, runtime errors, dialog clipping, and inaccessible focused controls are checked separately.

## Reproducibility

Run the Workshop build and serve it on port 8791 before the audit scripts. The server caches its HTML at startup, so restart it after rebuilding.

```sh
npm run build:workshop
npm run check
npm test
npm run test:workshop
CHROMIUM_PATH=/usr/bin/chromium npx playwright test --workers=2
node docs/audits/2026-10-13-beat-board-sweep/audit.cjs
node docs/audits/2026-10-13-beat-board-sweep/edge-layouts.cjs
node docs/audits/2026-10-13-beat-board-sweep/dialogs.cjs
node docs/audits/2026-10-13-beat-board-sweep/extra-dialogs.cjs
```

`ALL_BROWSERS=1` also enables Firefox and WebKit projects. Focused board, field, and sweep regressions are run in those engines. Detailed matrix results and representative screenshots are in `evidence/`.

## Validation results

- Build and shared-validator/syntax checks passed; server tests and all 18 Workshop test files passed.
- The complete 202-case Chromium run returned 200 passes, one intentional skip, and one old layout-height assertion. That assertion assumed beats had no Development row. It now allows the added rows while explicitly bounding their height; both desktop and mobile retests passed. The final story-field and character-arc run passed all 26 cases.
- All 26 focused Firefox/WebKit cases passed. One long WebKit field workflow initially reached the 30-second test limit while other audits were running; with a 60-second limit it completed in 26.9 seconds. No product change was required for that timeout.
- The 180-layout matrix has no document overflow, browser runtime errors, or Axe findings. All 60 core-dialog configurations and all 40 additional workflow configurations passed their final geometry, navigation, and accessibility checks. Intentional scroll-strip descendants remain in the raw geometry reports for review.
- Representative board, Refine, and field-editor screenshots were visually inspected. The last visual check caught missing pill styling on Refine beat fields; they now inherit their thread color, with fallback colors for standalone fields. Field/character regressions were rerun after that correction.

The pull request's CI runs the complete suite again against the committed build before merge.

## Limits

Automated WebKit is not a physical iPhone test; mobile card movement is available through the arrow buttons. Native card dragging is verified in desktop browser engines. The sync tests use an isolated mock API and the server test suite: they verify error handling and recovery, but do not diagnose the particular account warning in the supplied screenshots. No external account credentials or production story contents were used. This audit is evidence for the exercised workflows, not a guarantee that every possible manuscript or device has no defects.
