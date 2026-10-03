# Counterplot: approved story-workshop refinement

The read-only audit evaluated production at `https://counterplot.pages.dev`, deployment `59016415-e5e9-4154-afd8-525792cb6dec`, against `main` commit `227a644a71ae38f433f779e6f1af109bb0207e0e`. The deployed HTML matched that commit byte for byte (SHA-256 `12b33b22ea35704b3a239b89e858d059160812221cb64751eaf2b39680aa4950`). This audit follows, and does not replace, the earlier audit in the neighboring directory.

The user approved Phase 2 with “go for it.” Implementation preserves the Outline MICE tray's floating-bottom interaction. All account mutations and risky tests used synthetic accounts on an isolated local Pages/D1 server. No real production projects were edited, imported, deleted, or used as fixtures.

## Baseline judgment

| Criterion | Weight | Score / 5 | Principal criticism |
| --- | ---: | ---: | --- |
| Usefulness | 20% | 3.2 | Story context fragmented across forms and permanent peripheral controls. |
| Intuitiveness | 18% | 2.8 | Mixed save models, jargon, ambiguous failure states, lost navigation focus. |
| Creative flexibility | 17% | 3.7 | Strong optional histories and narrative orders; default character and causal scaffolding implied a preferred method. |
| Purposeful design | 16% | 2.5 | Repeated headings, context bars, controls and explanatory material displaced actual writing. |
| Satisfying feel | 15% | 2.4 | Large-outline lag, lost position, crowded notices and little landscape writing space. |
| Visual quality | 14% | 2.9 | Coherent editorial identity undermined by zero-padding plot summaries and inconsistent spacing. |

Weighted design score: **2.94/5**. Separate bug-freedom: **1.5/5**. The application offered substantial storytelling mechanics, but the cumulative effort spent operating it prevented it from feeling exceptional. These are baseline scores, not a claim that shipping fixes earns 5/5.

## Approved plan reconciliation

| Plan | Findings | Implemented behavior | Verification |
| --- | --- | --- | --- |
| P1: Account and session integrity | B1 account-crossing save; B2 expired-session dead end; D2 feedback | Workspace writes and uploaded parts require writer version 4 and an expected owner matching the authenticated cookie. Owner-aware reads and account operations reject stale tabs. Account broadcasts lock stale tabs; late responses cannot apply after identity changes. Reauthentication preserves local pending writing. Authentication, validation, update, storage and connection errors have distinct feedback. Static pages receive hashed-script CSP and framing restrictions. | Server boundary/old-writer tests; two-account browser reproduction; expiration with queued edits; recovery-code lifecycle; local CSP-enforced use. |
| P2: Unfinished work | B3 stale scene overwrite; B4 101-draft load failure; D2 | Scene drafts retain their source version. Stale or unknown-source drafts show both texts and cannot silently replace the current scene. Keeping both adds an independent scene. The artificial 100-draft ceiling is removed. Browser, imports and server use one generated validator. Unknown legacy fields and histories remain intact. | Existing/unfinished legacy fixtures; deliberate conflicting edits; keep-both reload; 105 saved drafts; malformed-reference rejection; export/import round trips. |
| P3: Capacity and performance | B5 5 MB save failure; B7 large-project delay | Workspaces above 200 KB upload content-addressed parts; a validated manifest publishes atomically with its recovery revision. A missing part cannot replace the last good save. Old whole-JSON rows remain readable. Capacity is 32 MB, with preflight checks for forks/imports. The existing 100-revision retention policy remains. Abandoned staging is bounded and cleaned independently of referenced history. Scalar writing avoids full migrations on each keystroke. Recovery checkpoints and active writing commit atomically to separate IndexedDB records, reducing repeated copying. Outline detail forms render on demand and textarea measurements are batched. | Actual 3.2 MB interconnected project and 6.45 MB fork; exact server/reload/history comparisons; incomplete upload, retries, stale revision and other-account chunks; old/new browser recovery formats; timing evidence. |
| P4: Shared spacing | B6 spatial failures; D6 | Plot summaries have real interior padding and adjacent actions. Shared action groups, forms, dialogs, notices, scene review strips, World state rows and mobile wrapping have consistent separation. Toasts sit above the floating MICE tray. Landscape uses the full editor height. | Visual captures across 320, 390, 768, 844-landscape and 1440 widths, plus 1920 geometry; selected plot action gaps/insets; reflow and accessibility checks. |
| P5: Continuous writing | D1, D2, D4 | Ordinary scene prose and craft text save while typing. Done applies the complete validated scene, including structural choices. Closing retains unfinished structural forms separately. Writing comes first; the planning-first toggle and routine Save unfinished button are removed. Existing unfinished versions remain recoverable. | Free prose, incomplete scenes, participants, beats, legacy variants, search, undo, reload, portable exports, Back/Forward, offline recovery. |
| P6: Context and architecture | D1, D4; B8 | Five destinations remain. Outline loses duplicate top-level creation/context UI. Storyline uses the project title. Cast lists are contextual, with direct cast access retained elsewhere. World material precedes ground rules and legacy exploration. Scroll and heading focus return when revisiting pages; writing from a thread returns to Outline. Empty character role strips disappear. | Contextual scene creation, navigation/focus restoration, all five destinations, legacy tools, story references and history checks. |
| P7: Creative defaults | D3, D4 | Empty core-character cards become optional shortcuts; existing material remains primary. Unassigned protagonists read “Ensemble / open focus.” Scenes without causal parents or an action summary no longer receive default explanatory bars or placeholder verdicts. Existing structures, free prose, nonlinear chronology and ambiguous outcomes retain their data and controls. | Character-free scenes, all craft fields, scene kinds, causal links, plot memberships, history and legacy migration tests. |
| P8: Interaction and access | D2, D5, D6; B6–B8 | Consistent target spacing, keyboard focus, preserved return position, reduced-motion behavior, compact landscape writing and access to Account inside the mobile editor. The MICE bar remains fixed/floating at the bottom; existing click-to-place, keyboard arrangements and drag workflows remain. | Keyboard navigation and guides; account focus return; spatial geometry and reduced-motion CSS; MICE insertion/reorder and undo checks. |
| P9: Verification and release | All | Reproduce original failures, inspect resulting state, run server and browser gates, publish a PR, merge only after required checks, delete implementation branch, verify deployed bytes and headers. | Evidence and release metadata below. |

No confirmed audit finding is intentionally left without an action. This is a reconciliation of the approved work, not a claim that every conceivable product defect has been eliminated.

## Preservation and deployment

- The workspace schema stays at version 3. Chunk storage is an additive server representation; exports remain ordinary JSON, and portable HTML stays self-contained.
- `migrations/0003_workspace_chunks.sql` is additive. The endpoint also creates that table idempotently, matching the existing deployment model without requiring production data rewrites.
- Current and historical legacy JSON saves decode unchanged. A manifest references owner-scoped immutable chunks. Current revision and recovery revision commit in one D1 transaction.
- Generated validator/CSP files are checked in CI; changes to inline scripts require `npm run generate`.
- Old clients are blocked from writing before they can cross an account boundary. Their local recovery remains available; the error directs them to export unsynced work before reload.
- Rollback must retain writer-version enforcement and chunk decoding. Reverting to a pre-chunk server would make newly stored manifests unreadable. Fix forward, or decode all referenced current/historical manifests before any such rollback. Do not drop the chunk table.

## Verification scope and limits

The suite covers functional outcomes, actual persisted state, migrations and unknown metadata, scene links, historical character/faction/world/reader state, imports/exports, recovery, conflict preservation, account boundaries, session interruption, desktop/mobile layouts, keyboard operation and automated WCAG 2.2 AA checks. Visual inspection complements those checks; a clean scanner is not a claim of WCAG conformance.

Chromium, Firefox and Playwright WebKit were run locally. WebKit used libraries extracted into `/tmp`, without changing the repository's runtime dependencies. This is not native Safari on an Apple device. Real assistive technology, native browser zoom, physical touch/virtual keyboards, and production account/session failover remain unverified. CSS 200% zoom and narrow reflow are supplementary checks. Production private data was not used for testing. No security certification is claimed.

Email ownership verification remains outside this approved implementation: the product has no email delivery service. Existing password/recovery-code behavior remains, with account-bound saves and explicit reauthentication. The supported workspace bound is finite; full exports remain available when saves cannot proceed. Large-project timings are measurements on this machine, not a universal latency guarantee.

## Measured outcomes

The final hosted local run used 180 scenes, 120 characters, 120 world entries, 120 outline pieces, 60 connections and 60 historical moments (3.23 MB). The 6.45 MB independent fork survived server read, page reload and exact historical-revision comparison. Outline navigation measured 267 ms; the earlier implementation pass measured 2,123 ms before hidden forms and repeated layout were removed. See `evidence/large-project.json` for every sample, including the remaining slower large Storyline navigation. Recovery checkpoint splitting reduced the repeated cost of writing without deferring durable writes.

Manual visual review identified two additional problems before release: a World state action lacked enough separation, and a scene's review banner crowded the text below it. Both now use the shared spacing rules. An empty character role banner was removed while preserving the Story roles tab.

Testing also exposed delayed autofocus that could send fast password input into the email field. Authentication now establishes focus synchronously on the intended field. Repeated registration, reauthentication, account recovery, and offline-cache checks verify the correction. The first intermittent failure was initially suspected to be local-server timing; investigation established the focus defect and it was fixed before release.
