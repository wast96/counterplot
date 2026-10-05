# Workshop integration status

Workshop integration `87e020a4f2125af0ea0d449552909d353b6b6b9f` was published
to GitHub `main` at the user's request. GitHub verification and Cloudflare Pages
deployment checks both succeeded. Direct Cloudflare configuration access remains
unavailable; publication uses the existing GitHub connection.

The follow-up [UI pass](UI-PASS.md) records responsive layout, information
grouping, outline tags, and interaction improvements with their verification.

Original GitHub main was verified at
`7d116c34d7eb9f7900480a4fa02377c1786d4363`. Local archive branch
`archive/pre-workshop-2026-10-05`, tag `backup/pre-workshop-2026-10-05`, and a
verified complete Git bundle preserve it. The backup tag was published alongside
the integration. The archive branch remains local until its Cloudflare deployment
exclusion can be verified.

## Candidate

- Workshop source and tutorial remain the forward application.
- Original schema 1–3 and Workshop schema 1 imports become editable Workshop
  schema 2, with exact originals retained separately for recovery.
- Outline, manuscript order and chronology stay independent. Rich writing,
  characters, historical selves, archives, world/knowledge, factions, connections,
  plot roles, drafts and exports have retained-feature controls.
- #32's rule-based alternative/what-if generator is absent. Old authored prose
  stays; unaccepted suggestions are recoverable drafts.
- Existing account credentials, sessions, recovery codes, history, revision/CAS
  and chunk storage remain in use. Owner-scoped browser recovery and tutorial
  sync are added. Old writers cannot overwrite converted accounts.
- Hosted build uses explicit `dist/`, shared browser/server model validation and
  script-hash CSP, including isolated tutorial authoring/Play.

## Review documents

- [Feature ledger](FEATURES.md): capability mapping and deliberate differences.
- [Verification](VERIFICATION.md): tests, defects fixed, capacity measurements,
  local database restore and remaining limits.
- [Release runbook](RELEASE.md): branch exclusion/protection, backup, staging,
  production replacement and rollback that preserves new-format writing.

## Required next environment capability

Cloudflare account/project access sufficient to read and configure Pages branch
controls and build settings, verify bindings/secret names without exposing their
values, export the existing D1 database and restore into an isolated database,
and observe the deployment. Keep `AUTH_PEPPER` unchanged.

The repository is public. A branch can be excluded from Cloudflare deployment;
its name cannot make it unreadable to Cloudflare. Literal source-access isolation
requires a different repository/access arrangement.
