# Counterplot Workshop

Counterplot is a writing workspace built around movable story pieces. Workshop is
now the application source. The existing Cloudflare Pages Functions and D1 account
service remain in place. See [integration status](docs/integration/STATUS.md) for
what has been verified and what still blocks the production switch.

## Build and run

```sh
npm ci
npm run build:workshop
```

The build writes the hosted application to `dist/index.html` and the root
`index.html`, generates CSP hashes and the shared server validator, and builds
portable Workshop/tutorial entry points. Publish **only `dist/`**; Pages Functions
remain in the root `functions/` directory. Source, fixtures, and backups must not
be published as static assets.

For accounts, configure a disposable local D1 binding named `DB`, apply
`migrations/0001_auth_and_workspaces.sql`, and use development-only secrets from
`.dev.vars.example`. Run:

```sh
npx wrangler pages dev dist --local-protocol=https
```

For local-only writing, open the generated `workshop/Counterplot Workshop.html`.
Portable HTML copies contain their own stories and tutorial definitions and do
not make account requests. Browser policy determines local-file storage support;
keep a JSON backup when working from a downloaded file.

## Writing, time, and migration

Outline, manuscript order, and story chronology have independent saved sequences.
Moving an outline branch does not silently retime character history. Write and
Read use manuscript order; Sequence arranges that order; Chronology arranges
historical events and dates. Scene craft, causal links, Inquiry evidence,
knowledge, world state, relationships, factions, and plot roles are contextual
controls. Changes at one moment can be applied and undone together.

Original Counterplot schema 1–3 JSON and Workshop schema 1 JSON are read into
Workshop schema 2. Import validates the file, retains the exact original in a
separate browser recovery record, and adds independent story copies. Character
states, life changes, checkpoints, archives, drafts, scene fields, historical
moment IDs, and extension metadata are retained. Old source-hashed scenes are
marked for a first continuity review in Workshop; this does not rewrite prose.

Rule-based scene alternatives and what-if generation have been removed. Existing
authored scenes remain; unaccepted old suggestions are recoverable drafts.

## Saving and backups

- Device saves use IndexedDB transactions with compare-and-swap checks. Failed
  saves retain the open writing and show recovery/export controls.
- Hosted accounts use the original credentials, session cookies, password hashes,
  recovery codes, workspace history, revision checks, and chunk storage.
- Private device records are scoped by account owner, including tutorial records.
- Concurrent conflicting projects are retained as separate story versions.
  Conflicting library records are available through Save a copy → Recovered
  library edits. They are not silently substituted for an open authoring draft.
- Story JSON includes the current story workspace and its Deleted stories.
  Complete library JSON also includes My work, tutorial definitions, practice,
  progress, and authoring drafts. Neither contains passwords or recovery codes.
- Imported tutorial records restore into an empty/matching library. A differing
  tutorial library is retained as a downloadable recovery copy for review.
- The account service supports up to 32,000,000 serialized UTF-8 bytes per
  workspace, including synced tutorial records. Images, many versions, and
  conflicting copies all consume that capacity. Undo history is bounded in memory.

Portable HTML is an independent local workspace, not a second account client.
The Account menu also recovers unsent writing retained by the old app on the same
browser and origin, and can add historical server revisions as independent copies.

## Account operations

Keep production `AUTH_PEPPER` unchanged: replacing it invalidates existing
passwords. `REGISTRATION_CODE` controls optional invite-only registration. Do not
copy production secrets or the production D1 binding into preview environments.
Sessions use Secure, HttpOnly, SameSite=Lax cookies. Passwords use salted
PBKDF2-HMAC-SHA-256 with 100,000 iterations. Recovery codes are one-use hashes;
reset revokes existing sessions without changing workspaces. Email ownership is
not verified and there is no email reset service.

Workshop sends writer version 5 and the current owner header. Original writer 4
continues to work for unmigrated accounts. Once an account contains Workshop
format, the API rejects old writes and current-workspace reads with HTTP 426.
Historical original revisions remain readable for recovery. The server retains
up to 100 workspace revisions and lists the latest 30.

| API | Purpose |
| --- | --- |
| `/api/auth/register`, `/api/auth/login`, `/api/auth/session`, `/api/auth/logout` | Existing account/session lifecycle |
| `/api/auth/recovery`, `/api/auth/reset` | Generate and consume recovery codes |
| `/api/workspace`, `/api/workspace?revision=N` | Current workspace and historical recovery |
| `/api/workspace-chunk` | Content-addressed chunk uploads |
| `/api/history` | Saved revision list |

## Checks

```sh
npm run build:workshop
npm run check
npm test
npm run test:workshop
npx playwright install --with-deps chromium firefox webkit
ALL_BROWSERS=1 npm run test:browser -- --workers=2
```

`CHROMIUM_PATH` and `WEBKIT_PATH` can select existing browser executables. The new
Playwright suite starts a static server with the hosted CSP and covers desktop,
mobile, migration, history editing, drafts, ordering, backups, portable markup,
and tutorial authoring. Python tests in `workshop/tests/browser-integration/`
exercise a real local Pages/HTTPS/D1 service on port 8788 and a static source
server on port 8765; they use disposable synthetic accounts only. Their setup and
coverage are recorded in [verification](docs/integration/VERIFICATION.md).

The supplied Workshop tutorial suites remain in `workshop/tests/`. Original-app
browser tests remain in `browser-tests/` as legacy regression material and
fixtures; they are not treated as new Workshop UI coverage. Historical audit
reports describe their original builds, not the current release candidate.

For the deployment sequence, archive exclusion, database backup, and
format-compatible rollback, follow [the release runbook](docs/integration/RELEASE.md).
