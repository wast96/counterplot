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
| `GET /api/workspace` | Load the latest workspace |
| `PUT /api/workspace` | Save with optimistic revision checking |
| `GET /api/workspace?revision=N` | Load one historical revision |
| `GET /api/history` | List the latest 30 revisions |

The server retains the latest 100 workspace revisions. Conflicting saves return HTTP 409 with the latest server workspace; the browser merge logic preserves conflicting project versions rather than silently overwriting prose.

## Operational notes

- Export a JSON backup before first enabling account sync and periodically afterward.
- D1 is the authoritative cross-device copy. IndexedDB is only a per-browser recovery queue.
- Registration currently does not verify ownership of the supplied email address and there is no automated password reset. Use invite-only registration until those features are added.
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


## Scene workshop

Storyline’s writing and exploration buttons, character/connection scene actions, and MICE thread exploration open one Scene workshop. Its five sections are **Set the scene**, **Build tension**, **Find the turn**, **Show the outcome**, and **Let it land**. All writing prompts are optional; a partial plan or prose-only scene can be added to Storyline. **Save unfinished draft** keeps an edit separate for later.

Scene Explorer is an optional question panel inside the workshop. Questions use the opening, immediate aim, participants, and preceding consequence. Prompt variations support attempts, discoveries, relationship moments, and aftermaths without rewriting any field. Keeping a question adds it to the possibilities scratchpad, not to the scene’s events. It is a local craft aid, not an AI prose generator.

Story range has been retired from the interface. Existing range values and earlier Explorer suggestions remain in backups; earlier suggestions can be opened in the new workshop from Storyline. Existing scenes and unfinished edits keep their original text. New craft fields and development beats are optional extensions to the existing workspace format and are included in JSON and Markdown exports.
