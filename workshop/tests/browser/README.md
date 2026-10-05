# Workshop browser QA

Run from the Counterplot directory after both builds:

```sh
python3 -m pip install -r workshop/tests/browser/requirements.txt
python3 -m playwright install chromium
python3 workshop/tests/browser/run.py
```

The runner fingerprints the exact main HTML before and after; do not modify it
while running. COUNTERPLOT_QA_OUTPUT chooses an evidence folder. Every job gets its
own subdirectory. COUNTERPLOT_QA_WORKERS defaults to 2; COUNTERPLOT_CHROMIUM can name
an executable. Tests use only disposable browser contexts and test-owned Storage.
The complete assembled app runs in an inline frame, not a replacement renderer.

## Suites

The runner executes 22 jobs: three full 22-stage/41-action walkthroughs at desktop,
tablet and phone widths; shared regressions; visual authoring; authoring lifecycle;
story portability; independent tutorial rebuild/export/playthrough; all 123 authored
story boundaries; ordinary/practice, sample and editor layout matrices; breakpoint
checks; native-origin probes; reported-bug repairs; contextual controls; a complete animated walkthrough, and loading
a saved failure captured from the exact old build; late-stage edit safety; and
old-build upgrade/recovery; tutorial database quota cases; and workspace/section/intro cases.

`repaired_workflows.py` exercises real automatic writing, manual Next, learner-word
preservation, interrupted animation, archived replacements, reload, restore and
undo/redo, plus native-size authoring and exports. `contextual.py` covers selection
without false edits, nearby tools, placement, export cleanup, native toolbar
picking, Play across sizes and its native Undo shortcut. `failed_save_recovery.py`
uses `../fixtures/archive-retry-old-build.json`, a synthetic old-build failure—not
an actual user’s work. The guide gets out of the way during a phone story drag;
touch tests inspect that behavior while the ghost is held.

Walkthroughs honor reduced motion by default for practical runtime; focused typing
scenarios use real character animation. Set COUNTERPLOT_QA_MOTION=full for a separate
animated walkthrough. Some checks inspect state/diagnostics or deliberately simulate
quota/conflicts; the suite is not entirely black-box or touch-operated.

Current results belong in `tests/evidence/storage-sections/final/`. Previous visual
studio and exploratory attempts are historical. The exact-build QA report explains
coverage; assertion counts are not usability or zero-bug certifications.

## Native-origin limits

`native_storage.py` separately attempts direct file and intercepted HTTPS navigation.
When the host blocks navigation before the app runs, it records HOST_BLOCKED and
returns normally so other evidence is retained. This is not a native-storage pass.
The Storage fixture proves exercised application save/restore logic, not a Mac
browser’s policy for local-file storage. Safari/Firefox, physical mobile devices,
software keyboards and production deployment are not exercised by this suite.

## Late-stage editing and upgrading the old app

`edit_safety.py` covers late-stage direct writing, shared native/author Undo,
plaintext-only text Undo, moves, form drafts, stage changes, Save/export/reload,
Play isolation, independent tutorials, importing practice, permanent Archive
removal and its saved removal markers, story shelf deletion,
restore/undo/redo/permanent confirmation, rename/duplicate and responsive views.

`upgrade_safety.py` runs the compressed exact previous InPlace HTML fixture,
creates synthetic visible final-stage edits, captures a recovery JSON using the
same helper shipped to the user, demonstrates the old Undo loss, and restores
that JSON in the repaired app. It exports/imports the recovered normal definition,
exports a playable HTML, then completes the recovered tutorial from empty with the fan
edits intact at the end. It also tests shelf/trash import and recovery conflicts.
It also captures old Play work before leaving Play and checks independent story
HTML exported from Play. The old fixture is the previously delivered project
build, NOT a user's browser data.

`common.mount` uses a nonce per mount so a test cannot accidentally accept the
old iframe while its replacement is still loading. A test-fixture race is not a
product failure; old attempts and corrective notes are retained separately.

## Storage and section cases

`storage_quota.py` reproduces the exact previous draft-quota error, exports its live
fan edit, and imports/saves/reopens it through the repair. Other cases cover large
baselines, compact journals, complete image-heavy definitions, quota=0 localStorage,
atomic failure/retry, slow Save with concurrent edits, dirty forms/cursor, isolated
Play, failed migration and independent tutorial imports.

`storage_sections.py` covers My work imports at full quota, workspace pending/error/
retry/exports, blocked unsafe switches, stale-window conflicts, independent copying
from practice and Edit, original shelf/form preservation, default and custom popup
sections, direct drag/text, scoped arrangement, export/reload, Next-only intro/Play,
old draft/numeric progress migration, progress retry and responsive layouts.

These tests inject a separate asynchronous IndexedDB-interface implementation in
an isolated browser fixture. They check the real app's transactions, not a separate
mock UI; they still do NOT test native database disk behavior. The regular tests
also exercise the explicitly limited localStorage fallback. Do not count native
HOST_BLOCKED as a successful file launch or database verification.
