# Counterplot

Counterplot is a static writing workspace deployed on Cloudflare Pages. The hosted edition uses Pages Functions, a D1 database, and first-party email/password sessions to synchronize a private workspace between devices.

## Authentication model

- Passwords are derived with PBKDF2-HMAC-SHA-256, a unique salt, and 100,000 iterations (the Cloudflare Workers native limit). The readable password is never stored.
- Session identifiers are random, are delivered in `Secure`, `HttpOnly`, `SameSite=Lax` cookies, and are stored in D1 only as SHA-256 hashes.
- Eight unsuccessful attempts for the same email/IP pair cause a 15-minute lockout.
- Registration is open when `REGISTRATION_CODE` is absent. Set that secret to make registration invite-only.
- `AUTH_PEPPER` is configured in production and preview, separately from the database. It must remain stable: changing it invalidates every existing password.

## Cloudflare setup

### 1. Create the D1 databases

Create separate production and preview databases in **Workers & Pages → D1 SQL Database**. In the Counterplot Pages project, add a D1 binding named exactly `DB` to each environment.

Apply the migration to each database. With Wrangler installed and authenticated, a typical command is:

```sh
npx wrangler d1 execute <database-name> --remote --file migrations/0001_auth_and_workspaces.sql
```

The database name is deliberately not committed because it belongs to the Cloudflare account rather than the application.

### 2. Configure secrets

In **Workers & Pages → Counterplot → Settings → Variables and Secrets**, optionally add encrypted secrets:

- `REGISTRATION_CODE`: require this value when creating an account. Recommended until email verification and bot protection exist.
- `AUTH_PEPPER`: additional password-hash material. Generate a long random value and back it up securely. Never change it after accounts exist.

Use `.dev.vars.example` as the template for local development. Do not commit `.dev.vars`.

### 3. Deploy

The application has no build step. Configure the Pages project to publish the repository root and keep the root-level `functions` directory. A Git-integrated Pages project deploys the selected production branch automatically after it receives a push.

### 4. Create the first account

Open the deployed site and select **Create an account**. If `REGISTRATION_CODE` is configured, supply it. On the first successful login, Counterplot offers to import an existing `counterplot.workspace.v1` browser save. It leaves that original browser copy untouched.

After creating the intended accounts, keep the registration code private or replace it to prevent additional registrations.

## Local development

Copy the example secrets and fill in development-only values:

```sh
cp .dev.vars.example .dev.vars
```

Create a local D1 database binding with Wrangler and apply the migration, then run Pages locally:

```sh
npx wrangler pages dev . --d1 DB=<database-id>
```

Opening `index.html` directly does not provide the API and will remain on the connection screen; use the Pages development server.

## API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/register` | Create an email/password account and session |
| `POST /api/auth/login` | Authenticate and create a session |
| `GET /api/auth/session` | Return the current account |
| `POST /api/auth/logout` | Revoke the current session |
| `GET /api/auth/recovery` | Count unused recovery codes |
| `POST /api/auth/recovery` | Rotate eight recovery codes after password confirmation |
| `POST /api/auth/reset` | Use one recovery code to reset a password and revoke sessions |
| `GET /api/workspace` | Load the latest workspace |
| `PUT /api/workspace` | Save with optimistic revision checking |
| `GET /api/workspace?revision=N` | Load one historical revision |
| `GET /api/history` | List the latest 30 revisions |

The server retains the latest 100 workspace revisions. Conflicting saves return HTTP 409 with the latest server workspace; the browser merge logic preserves conflicting project versions rather than silently overwriting prose.

## Operational notes

- Export a JSON backup before first enabling account sync and periodically afterward.
- D1 is the authoritative cross-device copy. IndexedDB is only a per-browser recovery queue.
- Registration does not verify ownership of the supplied email address. Recovery uses saved one-time codes, not email ownership. Accounts without saved codes cannot use automatic recovery. Consider invite-only registration when email ownership matters.
- Never log passwords, cookies, registration codes, peppers, or complete workspace JSON.

## Development checks

```sh
npm ci
npm test
npm run check
npx playwright install chromium
npm run test:browser
```

The browser suite tests the local edition with fresh workspaces on desktop and mobile, including the scene canvas, free prose and unfinished drafts, idea exploration, development beats, legacy saves, and JSON/Markdown exports. It does not need Cloudflare credentials or a running server. To use an existing Chromium installation, set `CHROMIUM_PATH` to its executable path when running `npm run test:browser`.


## Writing and planning

Storyline opens a page-sized writing workspace. A scene can contain prose alone and needs no character or viewpoint. Planning is optional; the writing-first preference and last section are remembered on the device. **Read scenes** shows the manuscript in reading order. Search includes every scene craft field, development beats, archived scenes, and unfinished edits.

Scene planning keeps your own questions and possibilities beside the writing. Starting from a character, connection, or outline piece carries those story links into the same editor. Generated question cards have been retired; previously saved questions and notes remain in existing projects and exports. Quiet observation, ambiguity, atmosphere, repetition, and incomplete endings are supported. Earlier rule-based alternatives and pinned-block what-if comparisons remain under World's **Earlier exploration tools**.

**Outline** supports ordinary beats without requiring MICE. Existing MICE threads, closures, multi-plot membership, and evidence links remain editable through optional controls. **Changes after this scene** queues changes to character blocks, life status, plot roles, relationships, faction state, knowledge, World conditions, and reader disclosure. One transaction applies the queue; one Undo restores it. Reader-only changes do not create story-time moments or grant character knowledge.

## Compatibility and recovery

Workspace schema 3 permits scenes with no viewpoint. Schemas 1 and 2 are validated on a copy and upgraded without replacing historical source snapshots or unknown metadata. A pre-upgrade browser copy is retained when storage permits. Existing JSON backups, portable HTML, historical character states, pins, unfinished drafts, and source links remain supported. Portable HTML uses the local edition and its own storage namespace.

Clients send `X-Counterplot-Writer: 3`. The API rejects older writers and schema downgrades with HTTP 426 once an account has saved schema 3. Reloading the deployed application enables the current writer. First-save conflicts without a common base preserve both projects or versions.

Account recovery codes are generated only after current-password confirmation. Only hashes are stored in D1. Rotation invalidates the old set; reset atomically consumes one code, changes the password, and revokes all sessions without modifying workspaces. Save the codes outside Counterplot. There is no email reset service.

`migrations/0002_recovery_codes.sql` adds only the recovery-code table. Recovery endpoints also provision that same table idempotently through the existing D1 binding on first use, allowing Git-connected Pages deployments without a separate migration credential. For managed deployments, apply the migration with the project's existing Wrangler/D1 configuration. Existing story tables are unchanged.

## Extended verification

`ALL_BROWSERS=1 npm run test:browser` adds Firefox and WebKit (install their Playwright binaries and system dependencies first). Responsive checks cover widths 320, 390, 768, 1024, and 1440. The compatibility fixture includes historical states, private knowledge, reader appearances, pins, source snapshots, MICE links, and unfinished edits.

The account browser test is skipped unless `TEST_SERVER_URL` points to an **isolated local** Pages server with a disposable D1 database initialized with migration 0001. Use HTTPS (`wrangler pages dev --local-protocol=https`) when testing WebKit: it correctly requires a secure connection for session cookies. The test accepts the local development certificate. It creates synthetic accounts and exercises migration 0002, recovery rotation, single use, session revocation, and preservation of writing. Run it with:

```sh
TEST_SERVER_URL=http://localhost:8791 npm run test:browser -- browser-tests/account.spec.js
```

The [October 2026 workspace audit](docs/audits/2026-10-03/README.md) records the approved simplification, data-preservation checks, responsive evidence and verification limitations. Reproduce visual evidence with `node scripts/capture-workspace-audit.mjs`; run real isolated sync verification with `TEST_SERVER_URL=http://127.0.0.1:8790 node scripts/verify-local-sync.mjs`.
