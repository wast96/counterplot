# Full workspace UX/UI and bug sweep — 13 October 2026

The later-character-block repair was merged in [PR #22](https://github.com/wast96/counterplot/pull/22), deployed, and compared byte for byte with production before this sweep began. It makes retained and checkpoint-derived blocks visible in Their arc and gives later blocks working edit/archive actions. The repair preserves earlier history and supports undo, restore, reload, and permanent removal.

This follow-up audits the whole current workspace rather than only that repair. All interaction checks use synthetic stories and disposable local accounts. No production manuscript or production account data was changed.

## Confirmed defects corrected

| Finding | Correction | Regression coverage |
| --- | --- | --- |
| Opening a dialog focused its header utility controls before its editable fields. | Focus starts at the first visible editable field, respecting explicit autofocus. Dialogs without fields retain a usable button target. | New character, World editor, block search, and block-label editor; keyboard close restores the opener. |
| Tab could leave an open dialog for browser chrome at the last control. | Both forward and reverse navigation wrap between the currently available dialog controls. Disabled and hidden controls are excluded. | Repeated Tab, Shift+Tab at the first control, forward wrapping at the last control, and Escape. |
| The type-of-change suggestion list could receive native scroll-container focus. Its close-on-blur handler then hid the focused element, leaving focus on the document. | The list is outside the Tab sequence. Tab closes suggestions before continuing to the next field; arrow keys and Enter still select suggestions. | Type picker → next field → reverse Tab → keyboard selection → next field. |
| Sticky dialog actions covered keyboard-focused fields on short screens. | Dialog scroll padding reserves the measured footer height, including wrapped footers. A resize observer keeps that allowance current. A focus-visibility check also handles WebKit, which does not consistently honor focus scroll padding. | Twenty-two consecutive Tab steps at 320×568, checking that the focused element is actually on top at its center. The broader dialog audit also checks occlusion. |
| Block-library descriptions and category labels were too faint and small. | Use the existing accessible muted color and 12px text, retaining all categories and descriptions. | Axe scans of the library in the browser suite and dialog matrix. |

The Firefox World-editor contrast failure was a test timing issue: Axe sampled its partially transparent opening animation. The scan now uses reduced motion, as the main-view scans already did. Its settled colors passed without a product color change.

These changes preserve the floating MICE tray, saved data format, story features, and existing state/history semantics. No new workflow or feature was added.

## Layout and interaction coverage

### Main views: 160 measured layouts

- Normal and long-text stories at widths **320, 390, 768, 1024, 1440, and 1920px**: eight views × two variants × six widths = **96 layouts**.
- Empty and dense stories at **320×568, 640×450, 768×600, and 1440×900**: eight views × two variants × four sizes = **64 additional layouts**.
- The dense fixture adds 70 outline pieces and 20 named characters. The long-text fixture includes repeated titles and unbroken strings in blocks, World entries, and connections.
- Checked document overflow, clipped controls, runtime errors, and navigation. Intentional scrolling strips—cast, timeline, and Refine moment navigation—were reviewed separately from page overflow.
- No page overflow or browser runtime errors in these 160 layouts. No Axe violations in the 16 populated-view scans or eight empty-view scans.

| Area | Exercised behavior |
| --- | --- |
| Outline | All four MICE types, nested beats, independent titles, inline states, parallel outcomes, context links, outer-thread contributions, native/pointer dragging, folding, and archive actions. |
| Chronology | Opening/beat/closing moments, movement boundaries, date grouping, history order, and removal of archived/deleted thread placeholders from character navigation. |
| Sequence | Independent reading order, closing movement, correct-edge editing, undo, and persistence. |
| Refine | Opening/closing selection, type-specific planning fields, participant roles, viewpoint, connected pieces, optional craft notes, narrow layouts, and retained writing data. |
| Characters | Baseline and later blocks, custom labels, duplicate-label disambiguation, forks, Their arc, archived origins, saved selves, timed changes, and archive/restore/purge. |
| World | Readable long names, title-to-editor action, different entry types, notes, references, and recorded conditions. |
| Connections | Both parties, readable labels, optional terms, historical changes, and shared-stakes disclosure. |
| Archive | Searchable unfinished edits, resume/discard, undo, archived branches, restore/permanent removal, and separation from Drawer content. |

Representative desktop and phone screenshots were visually reviewed, including Outline, Refine, Characters, Chronology, World, Connections, and state dialogs. The screenshots retain the app's existing design rather than introducing a second visual system.

### Dialogs: 60 configurations

Fifteen workflows at widths 320, 390, 768, and 1440px; phone dialogs use a **568px-high viewport**. The workflows are story shelf, new/edit character, block library/editor, new/edit World entry, new/edit connection, export, account login, plot management, Add change, character state, and search.

Checks cover dialog and body overflow, field labels, keyboard containment, visible/uncovered focus, and browser errors. Thirty dialog accessibility scans cover the 390px and 1440px variants. Final results are in `evidence/dialog-results.json`.

### Account and recovery checks

A real local Cloudflare Pages worker and disposable D1 database exercised the current app with two independent browser contexts:

1. Register a synthetic account and load a typed Workshop workspace.
2. Sign in on a second device and verify the same outline.
3. Disconnect the first device from workspace requests, edit both copies, reconnect, and verify that both conflicting story versions survive reload.
4. Sync tutorial progress and its deletion between devices.
5. Change the account cookie and verify the old tab locks instead of writing to the new account; the new account cannot see the first account's stories.
6. Generate a recovery code, reset the password, verify session revocation and one-use enforcement, and verify both preserved story versions remain.

All six checks passed with no browser runtime errors. This is a local Pages/D1 integration test, not a test against the production database.

## Final automated validation

| Check | Result |
| --- | --- |
| Build, syntax, generated validator and CSP consistency | Passed |
| Server/authentication tests | 20 passed |
| Workshop model/storage/tutorial tests | 403 passed |
| Chromium desktop + mobile browser suite | 171 passed; one desktop Shift-selection test intentionally skipped on touch/mobile |
| Firefox full browser suite | 86 passed |
| WebKit full browser suite | 86 passed |
| Final focused dialog regressions | 16 passed across Chromium desktop/mobile, Firefox, and WebKit |
| Exploratory layout/dialog accessibility scans | 54 scans, zero violations |
| Disposable Pages/D1 integration | Six account/sync/recovery scenarios passed |

The final release checks also run the complete Chromium suite in GitHub Actions. The last WebKit-specific correction was retested in the full Firefox/WebKit suites and all four focused dialog configurations.

Built HTML SHA-256: `ff0776c1326ffc91272d493ae393efdbb6015289a862f5ab8b22c8c89beb5a9d`.
The release procedure compares this artifact with production and runs an isolated live browser smoke test after deployment.

The suite covers migration and retention, custom labels and forks, overlapping open threads, drag/drop, bulk changes, filtering, backups/imports, unfinished editors, tutorials, focus, and browser accessibility. A passing run is evidence for those exercised cases, not a claim that every combination has been exhaustively proved.

## Reproducing the exploratory checks

From the repository root, run `npm run build:workshop` and start `node scripts/serve-workshop.mjs`. The scripts use installed Playwright and Axe packages, `/usr/bin/chromium`, and write evidence to `/tmp/counterplot-sweep`.

```sh
node docs/audits/2026-10-13-full-sweep/audit.cjs
node docs/audits/2026-10-13-full-sweep/edge-layouts.cjs
node docs/audits/2026-10-13-full-sweep/dialogs.cjs
```

`accounts.cjs` requires a separate disposable Pages/D1 service at `https://127.0.0.1:8788`, with the repository migration applied and a synthetic `AUTH_PEPPER`. It registers synthetic accounts and changes only that local database. Do not point it at production.

Browser regressions are in `workshop/browser-tests/dialog-navigation.spec.js`; the other existing suites remain in the same directory. Firefox and WebKit are enabled with `ALL_BROWSERS=1`. This environment needed temporary WebKit libraries outside the repository; no application security policy was relaxed.

## Limits

- Phone and tablet layouts were tested in browser emulation, not on physical iOS/Android hardware or with an on-screen keyboard.
- Automated accessibility checks and keyboard navigation were exercised; no screen-reader user study was performed.
- Dense-layout timings describe this environment, not a performance guarantee for every device or manuscript size.
- External service outages, production D1 restoration, and every possible multi-device race are outside this sweep. The relevant model/storage and local account scenarios passed.
