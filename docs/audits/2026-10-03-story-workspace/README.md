# Counterplot: story workspace continuity

Baseline: `main` at `3adc1d683e58d9a66c53125bf2e99e294228fda9`, verified against the HTML at https://counterplot.pages.dev (Cloudflare deployment `8137bf6a-2ab5-431c-bf01-bc467c4c0e34`). The user approved the audit and three-part plan, adding the requirement to retain a restorable copy of the prior code. The current instructions are preserved verbatim in `user-instructions.txt`.

## Original judgment and scope

Usefulness 3.5 (20%), intuitiveness 3.6 (18%), creative flexibility 4.1 (17%), purposeful design 3.4 (16%), satisfying feel 3.6 (15%), visual quality 3.9 (14%): weighted **3.68/5**. Separate bug-freedom: **3.0/5**. Strong narrative-state mechanics were undermined by a questionnaire below the writing, long full-prose Sequence cards, and repeated World/Outline scaffolding. Quiet or unassigned scenes still encountered unnecessary assumptions. These baseline scores are not automatically increased by shipping changes.

## Approved plan reconciliation

| Approved item | Result | Evidence |
| --- | --- | --- |
| P1: contextual scene writing | Verified. Prose and optional working notes share the editor. Wide screens show both; smaller screens switch between them. Populated fields are retained; unused fields are added through one selector. Context is accessible at the top of the pane, with moment-specific character blocks, known facts, connections, predecessor and linked MICE threads. Previous/next navigation retains selection, scroll and notes state. | `workspace-experience.spec.js`, scene/search/legacy/export regressions, rendered desktop/mobile/landscape inspection. Historical knowledge checks distinguish opening from later facts. |
| P2: useful Sequence | Verified. Compact rows with short excerpts replace full prose by default. One complete preview is available at a time; Read scenes remains continuous. Secondary analytical views remain under Other views. The chosen view persists per project. Move selects a direct position in the complete reading order. | 180-scene test checks bounded overview, one preview, persistence and exact retained scene/moment/Outline records after reordering. Reading, continuation and search regression verifies remembered view. |
| P3: simpler World and Outline | Verified. One World material filter replaces the duplicate material/group navigation. Group tools remain accessible from their cards and return to material. Outline retains compact plot selection, shared filters and all plot actions without repeated headings. | Existing world/state/faction behaviors preserved; responsive tests across 320–1440 widths and 844×390 landscape. First World card is above 600 px on a 390 px viewport, versus 783 px in the baseline. |
| Protected floating MICE bar | Verified locally across the viewport matrix. Remains `position:fixed`, 12–22 px from the viewport bottom; the last Outline item scrolls clear of it. No relocation or conversion to an inline panel. | `workspace-experience.spec.js`, `refinement.spec.js`, `evidence/dense-layouts.json`. Chronology retains its pre-existing absence of the nested Outline palette. Live verification is a separate release gate. |
| B1: remote update can be silently overwritten by a clean open editor | Verified fixed. A clean scene editor reconciles with the new canonical record; uncommitted forms defer remote replacement. A stale scene base triggers the existing keep-both conflict workflow. Account/project changes close the previous editor. | Routed network regression plus original real two-device reproduction: both editor and stored record keep the newer ending after Done. `evidence/concurrent-editor.json`. Existing conflicts/account-boundary checks also pass. |
| B2: application Undo leaves stale prose in the editor | Verified fixed. Undo/Redo reconciles the visible scene; Done and reload preserve the undone result. Mobile editor includes usable history controls. Native text-field undo remains native. | Desktop/mobile/Firefox `continuity.spec.js`. |
| B3: long POV names overflow Outline filters | Verified fixed at tested viewports. Shared filters can shrink and wrap. | Original long-content reproduction reports no overflowing elements at 768 px; 320, 844 and 1440 also fit. See zoom limitation below. |
| B4: unchanged Done creates revisions | Verified fixed. Semantically unchanged content does not run an update transaction. | Three repeated real-account Done operations retain revision 2: `[2,2,2,2]`. |
| B5: a named fragment gets misleading content error | Verified fixed. A title alone can be saved; a generic new scene has no assumed viewpoint. | New title-only regression, existing character-free/incomplete-scene tests. |
| Supporting copy/export work | Verified. Guide copy describes automatic writing saves and optional notes. Writing briefs stop treating omitted optional wants, methods and relationship agendas as decisions requiring correction. Existing fields, author knowledge and legacy data remain exportable. | Full JSON/Markdown and portable-export regression suites; validator and migration fixtures. |

## Measurements and validation

The same dense fixture's Sequence decreased from **1,501,533 px to 46,828 px** at 1440×1000 while retaining 180 scenes. Full prose still appears in Read scenes. The interconnected hosted fixture is 3,225,877 bytes; its 6,450,394-byte independent fork survives exact server, reload and historical-revision comparisons. Storyline navigation measured 179 ms in that run. These are measurements on the test machine, not general latency guarantees.

- `npm run check` and all four Node test files pass.
- Chromium: 88 local/routed browser cases plus four real-account cases pass (desktop/mobile). Real accounts use an isolated HTTPS Pages/D1 server and synthetic credentials.
- Firefox: 44 local/routed browser cases pass. The two account cases were exercised separately in Chromium.
- Original live-editor concurrency, unchanged-save, long-content, large-workspace and conflict/recovery reproductions were repeated against the new code. No real production account data was accessed or mutated.
- Accessibility scans pass on main pages, Account, the scene editor and the notes pane. Keyboard focus, search, browser Back/Forward, content preservation and responsive geometry have explicit checks. This does not establish complete WCAG conformance.
- WebKit cannot launch in this environment because required system libraries are unavailable; Safari and physical touch/assistive-technology behavior remain unverified.
- CSS `zoom:200%` is supplementary stress evidence, not native browser zoom. It reduces the earlier 3,006 px document width to 1,547 px, but the horizontal plot scroller still produces 107 px of extra document width in that artificial mode. Equivalent narrow viewports pass. Native browser zoom remains unverified; do not claim a full zoom pass.

The writing workspace now spends much less space on unused questions and preserves local working context. It remains a plain-text editor, and long populated notes still require scrolling within the optional pane. On smaller screens the author switches between notes and prose. The retained analytical views and historical systems still have learning costs. The application has improved; this is not a claim of exceptional 5/5 quality or complete bug-freedom.

## Restore point and compatibility

The annotated GitHub tag **`backup/pre-story-workspace-2026-10-03`** points to the exact baseline commit. Before implementation, a full verified Git bundle and source archive were saved at `/workspace/backups/counterplot-before-2026-10-03/`:

- `counterplot.bundle`: SHA-256 `8b3ca4a984ae5577aca9ea7c3e92106f65ad78f7a4bdda9c82b6601b030ac70d`.
- `source.tar.gz`: SHA-256 `7864acf933ccd418cb30df31c114f525da211e8ccb08ec4d220eecbafba6dad2`.

To inspect the previous version without disturbing current work: `git switch -c restore-review backup/pre-story-workspace-2026-10-03`. To restore the deployed product after this PR merges, revert this PR's merge/squash commit on a new branch, run the checks and merge the restore PR. Prefer a revert to force-resetting shared history. If GitHub is unavailable, clone the bundle into a separate directory and check out the backup tag.

This cycle changes no server endpoints, database schema, migrations or workspace schema. Existing scene records and retired/unknown data fields are retained. Reverting this cycle's code does not require rolling back or deleting the user's newer story data.

## Deferrals

As approved: no new generation service, rich-text editor, branch-management product, authentication replacement, offline sign-in, or email-delivery recovery. Account identity and recovery remain as established. No separate speculative cleanup cycle is included. Production merge requires passing GitHub checks, followed by live source and MICE verification and removal of the implementation branch.
