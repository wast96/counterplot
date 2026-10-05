# Workshop candidate verification — 2026-10-05

The checks use synthetic stories and accounts. No production credential, database,
or user manuscript was used. Passing these checks is evidence for the exercised
behaviors, not a zero-bug certification.

## Build identity

Final hosted HTML SHA-256:
`f1e5d14944a58ea05bd6258f953e81118b4d6f00b933a0f3ae0e5f45d5e84479`.

The candidate is on `integration/workshop`. The final Git commit also records
this report. `npm run build:workshop` regenerates root/`dist` HTML, tutorial
artifacts, shared server validation and CSP. `npm run check` checks generated
agreement and syntax. No source or test files are published by `dist/`.

## Automated and interactive checks

| Check | Result / scope |
| --- | --- |
| Build and generated checks | PASS; shared validator, hosted HTML, CSP, 15 server modules and one inline application script |
| Original API suites | PASS; five test files including auth, recovery, sync, integrity, and Workshop migration |
| Workshop model/storage/tutorial suites | PASS; all nine supplied/extended Node test files |
| Semantic integration suite | PASS; 21 focused tests covering migration state parity, separate orderings, archived outline versus manuscript, earlier selves, faction timing, identity replacement, evidence deletion, tutorial starter, causal cycles, continuity and large-library restoration |
| Browser regression | Nine scenarios in each of desktop Chromium, mobile Chromium, Firefox and WebKit; 36 scenarios in the release run |
| Full tutorial | PASS; all 22 stages / 41 actions on 1440px desktop and 390px mobile viewport, including sample insertion, writing, moves, archive/undo/restore, plots, references and export |
| Retained-feature browser flows | PASS; scene craft, earlier-self edit, faction split, old tagged-outline input, full story backup/reimport |
| Native storage | Browser imports, unfinished forms, acknowledged history saves, reload and library recovery use real IndexedDB; supplied suites additionally exercise abort/quota/CAS/failed-switch paths with controlled fixtures |
| Supplied edit-safety browser suite | 19 of 20 cases passed on the prior candidate; the remaining narrow-layout case passed after the toolbar fix at 1440, 768, 390 and 320px |
| Supplied quota/failure browser suite | PASS; all 12 cases, including migration failure, atomic failed publish/retry, concurrent edits during save, unfinished-form recovery and large image-bearing tutorial records; uses controlled quota and transaction fixtures |
| Hosted tutorial CSP | PASS; full-size author frame and temporary Play storage run under script-hash CSP; no script/eval exception introduced |
| Existing accounts | PASS on local Pages HTTPS/D1; original workspace converted, old writer gets 426, historical versions retained |
| Concurrent devices | PASS; independent login sessions, offline competing prose, both versions preserved, reload and tutorial-record deletion |
| Account isolation | PASS; changed cookie cannot save through the old owner, second account cannot see the first account's stories or tutorial cursor |
| Account recovery | PASS; one-use code, password reset, revoked sessions, old code refused, both preserved prose versions remain after login |
| Large device workspace | PASS; original file 29,311,070 bytes imported, edited, saved and reloaded |
| Large account workspace | PASS; approximately 29 MB migrated workspace uploaded in chunks and reopened with 29,250,270 prose characters retained |
| Local database restore | PASS; consistent SQLite backup exported to SQL, restored into a separate database, all rows match, integrity check `ok` |

The semantic suite runs directly with `node workshop/tests/integration.test.cjs`.
The test runner in this environment summarizes the other Node invocation by file;
its “nine tests” line refers to files, not nine individual assertions.

## Measured capacity behavior

On this managed environment, the large original-file import reached its review
screen in 2.02 seconds, completed in 3.30 seconds, and reloaded in 1.21 seconds.
The account's chunked save took 16.98 seconds. These are single-run observations,
not performance guarantees for other hardware or Cloudflare production limits.

Structured cloning reduced a local 29 MB copy benchmark from roughly 502 ms to
62 ms. Reading/event lookup uses indexed maps, and Undo has a memory budget so
large projects do not accumulate fifty complete large-workspace copies.

Use `workshop/tests/create-large-fixture.cjs` to generate the synthetic capacity
fixture instead of committing a 29 MB test manuscript. Browser scripts
`large-workspace.py` and `large-account.py` generate it before their checks.

## Local Pages setup used

- Wrangler 4.147.0, disposable D1, `https://127.0.0.1:8788`.
- Synthetic `AUTH_PEPPER`; no production secrets.
- Local binding/config `wrangler.jsonc` is excluded from Git.
- Source server: port 8765. Playwright starts its CSP server on port 8791.
- `python workshop/tests/browser-integration/accounts.py`
- `python workshop/tests/browser-integration/retained-features.py`
- `python workshop/tests/browser-integration/hosted-tutorial.py`
- `python workshop/tests/browser-integration/large-workspace.py`
- `python workshop/tests/browser-integration/large-account.py`

Browser binaries used local Chromium plus Playwright Firefox and WebKit. This
host lacks root installation permission; WebKit libraries were extracted outside
the repository and supplied through a local launcher. No production/application
policy was relaxed for those libraries.

## Restore evidence

Final local restore contained 12 synthetic users, 10 sessions, 8 recovery-code
rows, 8 current workspaces, 31 revisions and 47 chunks, plus auth attempts and
Cloudflare metadata. Every table's rows matched the consistent backup snapshot.
SQL export: 3,436,534 bytes; SHA-256
`a2537dd7207ee1838529b56776e4aff1733835b79ab71c15b6b64946f8ee9a7a`.
Backups remain outside the repository and static publication directory.

This was a **local SQLite/D1 data round trip**. Wrangler's local export command
did not accept the custom persistence path; it was not passed off as a successful
Cloudflare platform export. Production export/Time Travel and restoration remain
release gates.

## Bugs found and addressed

- Original archived outline frames accidentally hiding active manuscript scenes.
- Empty first-load account seed racing with incoming account data.
- Dynamic tutorial frame bootstrap incompatible with the hosted CSP.
- Firefox delivering a non-Element blur target to the authoring handler.
- Deleted remote tutorial records returning from a stale local key.
- Tutorial library UI retaining an outdated definition map after account sync.
- Tutorial identity replacement leaving chronology/reading/knowledge links behind.
- Duplicate beats retaining the original manuscript identity.
- Permanently removed evidence sources leaving dangling Inquiry links.
- Empty tutorial starter inheriting all the sample story's historical moments.
- Causal scene edits allowing a cycle.
- Future character history changes falsely staling an earlier scene.
- Editing scene/knowledge forms dropping hidden archived participants or links.
- Archived records receiving weaker identity/content checks than active records.
- Opening the tutorial library hiding an existing storage-migration warning.
- Toolbar controls overflowing at narrow screen widths.
- The restore command retaining a 200-story limit after imports supported 1,000.

Two test issues were also corrected: the history editor test now chooses the
intended character and waits for the visible acknowledged device save before
reloading; the account test uses separate login sessions for separate devices.
An edit before asynchronous save acknowledgement is still subject to the app's
unsaved-work warning. Closing or crashing a browser before a transaction commits
cannot be described as a verified durable save.

## Remaining release checks

1. Real Cloudflare project/production branch, preview exclusions, D1 binding,
   stable secrets and staging isolation.
2. Production backup and isolated restoration with real platform tooling.
3. Staging runtime/quota behavior for near-capacity uploads and failure recovery.
4. Protected remote archive, reviewable PR, exact merged deployment and canonical
   origin smoke tests. No remote changes have been made yet.
5. Physical iOS/Android/Safari interaction, software keyboards and a full manual
   assistive-technology pass have not been established by viewport emulation or
   Playwright WebKit. The current browser tests do not cover every combination
   of every historical field.

See `RELEASE.md` for the remaining operations and the format-compatible rollback
constraint. Returning an unmodified old API to a database that contains Workshop
writes is not a safe rollback.
