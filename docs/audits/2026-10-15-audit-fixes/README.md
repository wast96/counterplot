# Audit fixes and verification — 15 October 2026

The earlier audit was read-only. This change implements the subsequent request to fix its findings. Tests use synthetic stories and disposable accounts; production manuscripts and accounts were not edited.

The changes retain Counterplot's quiet, exploratory workshop: movable pieces, reversible decisions, writing visible where it belongs, and clear explanations of where work is saved.

## Confirmed defects

| # | Finding | Result |
| --- | --- | --- |
| 1 | Authored titles could become HTML in dialog headings; portable copies lacked a CSP. | Dialog headings escape their text centrally. Portable exports generate a CSP containing hashes of their actual scripts. Authored markup stays literal in both versions. |
| 2 | Removing scenes or scene beats bypassed Archive. | Both actions archive complete records with their original positions. Restore survives reload, preserves writeups, and handles an archived or permanently removed parent scene. Retained beat identities and content are validated. |
| 3 | An oversized edit could be acknowledged locally but rejected when reopened. | Validate before queuing a device save. Invalid in-memory work receives a persistent warning and export action; the last valid saved copy remains intact. |
| 4 | Failed account identification silently opened the device library. | Startup requires an explicit retry or device-only choice after an identity failure. The explanation remains visible. Private account records are never guessed. |
| 5 | Keeping focus in a writing field stalled outgoing account updates. | Upload local changes while focus remains in the field. Defer incoming replacements until editing is finished, with an explanatory status. |
| 6 | The desktop tutorial began with a hidden editing target. | Tutorial preparation exposes the appropriate inspector or phone sheet. |
| 7 | Later tutorial targets referred to obsolete or hidden controls. | Correct nested placement, closing changes, archive menus, reference disclosures, plot toolbar transitions, and the final change review. Sample insertion exposes its editing field. The completed guide offers Review. |
| 8 | Find omitted scene plans and beat writeups. | Index scenes, scene beats, their archived copies, and unfinished authored text. Results open the right scene or Archive record. |
| 9 | Find searched raw JSON identities and gave misleading labels. | Search an authored-text allowlist and display meaningful record names, type labels, and excerpts. Exclude hidden identities, picture data, and source backups. |
| 10 | Markdown's Outline section followed chronology. | Export nested outline order independently of Chronology and Sequence. |
| 11 | Markdown used stale titles for included scene moments. | Resolve current linked moment names during export. |
| 12 | Markdown called World groups “Archived character.” | Resolve both character and World participants, including retained archived names. |
| 13 | Returning from Refine could open the wrong scene when a moment was shared. | Preserve the originating scene. If no origin is known, choose among matching scenes instead of silently picking one. |
| 14 | Several dismissed forms did not retain unfinished work. | Extend journaling to project, plot, selection, membership, and reference editors; preserve image context. Successful saves consume the correct draft even when the active story changes. |
| 15 | Character-state fields clipped long writing. | Use growing multiline fields, preserve linked-state operations, and resize after viewport changes. Scene and Refine titles also wrap. |
| 16 | Navigation replaced the focused control and left keyboard users on the document. | Move focus to the destination main region; retain normal dialog focus restoration. |
| 17 | Enter during IME composition blurred the editor. | Ignore shortcut/commit handling during composition. |
| 18 | An unmodified N created a beat. | Require Alt+N and update the shortcut help. |
| 19 | Startup was blank while identity resolved. | Show an immediate opening state and a recoverable failure state. |
| 20 | Phones hid local-save feedback. | Keep compact live save status visible, including pending and failed writes. |
| 21 | Large outlines repeatedly recalculated the same projections and interleaved layout reads/writes. | Cache read projections for one render, skip irrelevant state comparisons, batch textarea measurement, and target mirrored-field updates. See performance limits below. |
| 22 | Reload and browser Back lost the current working view. | Keep owner-scoped tab context and history for the active story, view, scene, selection, and folded pieces. |
| 23 | Scene printing retained interactive controls. | Print scene content without navigation, tray controls, archive buttons, and editing tools. |

## Further improvements

- Compact phone navigation, an optional collapsed sidebar on tablets/desktops, visible scrolling cues for story views, and a jump to the beat board.
- Larger touch handles/actions, visible “Edit fields” labels, readable active chronology labels, and a menu position that accounts for the tutorial panel.
- First-use choices to explore the example, start a story, or enter the tutorial. Help explains threads, moments, scenes, scene beats, independent orders, and recovery destinations.
- A current-story JSON export beside explicitly labelled whole-library exports. Sharing guidance explains that notes, pictures, Archive, and unfinished edits may be included.
- Storage & backups shows the supported library capacity, device/account status, browser storage estimates, and when a download was prepared. It does not claim that a prepared download was actually retained.
- Authentication forms support password managers, password visibility, clearer passphrase requirements, a pending-submit state, and recovery setup guidance. Atomic aggregate login and registration limits complement the existing per-account failure limits.
- Hosted startup omits optional tutorial picture payloads until needed. The page shrank from 2,343,456 to approximately 1,214,000 uncompressed bytes. Portable exports remain self-contained when the optional asset is available; unavailable pictures do not block the lessons.
- Separate modules now own view history, render caching, and backup/help UI. Documentation reflects the active views. CI runs Chromium, Firefox, and WebKit.

## Verification

A retry that receives its own previously committed snapshot now acknowledges that snapshot before handling newer typing, avoiding an unnecessary preserved-copy fork after a lost acknowledgement.

The focused regression files are `audit-repairs.spec.js`, `current-tutorial.spec.js`, and `workshop-care.spec.js`. The tutorial test performs every active goal through the current UI, including creating, moving, archiving, restoring, linking, and exporting, then verifies completion after reload. It runs on desktop, phone, and tablet.

The responsive sweep covers nine views, four story shapes (ordinary, empty, long text, dense), and seven sizes: 320×568, 390×844, 640×360, 768×1024, 1024×768, 1440×1000, and 1920×1080. All **252 combinations** passed page-overflow and browser-error checks. **27 Axe scans** of ordinary phone, tablet, and desktop views reported no violations. Six additional Axe scans of Storage & backups and registration dialogs passed. Scene print checks hid every interactive button at phone, tablet, and desktop widths. Screenshots were also reviewed. These checks do not replace physical-device or manual screen-reader testing.

Real local Pages/D1 checks passed registration, a second-device login, offline conflict preservation across reload, tutorial-record synchronization/deletion, changed-account locking, owner isolation, one-use recovery, session revocation, and retention of both conflicting versions of the writing.

Build consistency, server tests, and Workshop model tests pass. Browser-suite totals and release verification are recorded below after their final runs.

## Performance and practical limits

Using the audit's synthetic 500-piece story and the same host/browser, the initial unthrottled comparison reduced the return to Outline from roughly **3.1 seconds to 1.1 seconds**. With 4× CPU throttling, the corresponding measurement fell from roughly **20.9 seconds to 6.0 seconds**. These are individual diagnostic runs, not a statistical benchmark. Other verification was active during the new measurements.

Large outlines still create a substantial DOM (about 31,600 elements at 500 pieces) and can pause on slow hardware. This change reduces that cost; it does not implement list virtualization or promise instant rendering for arbitrarily large stories.

Offline editing in an already-open workshop remains supported. Reliable reopening offline uses a portable HTML download; the hosted app does not gain a service worker in this change. Account identity must be checked before private account records are opened. Optional tutorial pictures cannot be included in a new export if their asset is unavailable and they have never been loaded.

The live Pages project currently publishes the repository root. The generated hashed tutorial asset is included there as well as in `dist/` so this release remains compatible. The recommended publication target remains `dist/`; changing the existing Cloudflare project configuration is a separate operational change.
