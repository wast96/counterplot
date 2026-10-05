# Workshop release and rollback runbook

Status: production release is blocked on Cloudflare configuration/credential
access. The user authorized implementation and rollout. This is an operational
checklist, not a request to repeat that authorization. No production settings,
remote branch, or production database have been changed during local work.

## Preserved original

- Repository: `wast96/counterplot`.
- Original GitHub main: `7d116c34d7eb9f7900480a4fa02377c1786d4363`.
- Local archive branch: `archive/pre-workshop-2026-10-05`.
- Local tag: `backup/pre-workshop-2026-10-05`.
- Verified complete Git bundle outside the publication tree:
  `/workspace/counterplot-release-backups/pre-workshop-2026-10-05.bundle`.
- Bundle SHA-256:
  `7eaacfee820c5d766b7a8c77d7ce8f7f0eeb75d37d5e604fdb93207c5e032bae`.

A public GitHub branch is publicly readable. Naming a branch does not revoke
Cloudflare's read access to it. The enforceable goal here is to prevent that
branch from triggering production or preview deployments. Literal read isolation
would require a separate private repository or disconnecting Git integration;
do not claim that a branch exclusion provides it.

## Before any remote branch push

1. Read the actual Pages project configuration: account/project identity, custom
   domains, production branch, build command/output, preview branch policy,
   Functions routing, D1 bindings, and secret *names*. Do not print values.
2. Confirm the production-linked branch. GitHub default is `main`; do not assume
   Pages also uses it without reading the setting.
3. Disable preview deployment for `archive/*` and `integration/*`, or use an
   explicit allowlist that omits them. Record the setting and re-read it.
4. Ensure every enabled preview/staging environment has its own disposable D1
   database and test secrets. An HTTP preview hostname alone is not isolation.
5. Confirm existing production `AUTH_PEPPER` will remain unchanged. Preserve
   registration policy, session/auth routes, database binding name `DB`, custom
   domains, and user identity rows. Do not create a replacement account database.
6. Fetch main again. If it has advanced, preserve the newer live SHA, compare all
   changes, update the candidate, and repeat affected tests. Never force-push main.
7. Push the preserved branch/tag and candidate branch only after steps 1–6.
   Protect the archive from deletion/force push and verify it still points to the
   exact preserved commit. Verify no archive deployment was created.
8. Open a reviewable PR from `integration/workshop` to the verified production
   branch. Attach its URL to the Codex task. Include the feature ledger, exact
   tested SHA/build hash, validation report, and operational prerequisites.

## Database rehearsal and final backup

1. Inventory production tables and migration state read-only. Preserve users,
   sessions, workspace rows, revisions, chunks, recovery-code hashes, and rate
   limits together. This integration does not require renumbering accounts or
   replacing existing schemas.
2. Export a consistent D1 backup using Cloudflare's supported export/Time Travel
   facilities. Record database ID, UTC timestamp, bookmark where supported, size,
   and checksum. Store outside the repository/publication directory.
3. Restore into an isolated database. Compare table row counts, revision numbers,
   workspace JSON/manifest readability, chunk checksums, account identity hashes,
   and recovery-code records. Never route live traffic to the restored rehearsal.
4. Run staging migration against that copy only where access to real story data
   is authorized; otherwise exercise representative synthetic files and keep
   production inspection aggregate/read-only. Never print manuscript contents.
5. Ensure the final backup is recent enough for cutover. A restoration of an old
   database would lose newer writing, so do not use it as a routine rollback.
6. Confirm capacity and runtime limits in real staging: large chunked workspace,
   failed/retried upload, lost acknowledgement, two-device conflict, and reload.
   Local Pages does not establish production Workers CPU/size/quota behavior.

## Candidate acceptance

- Every preserved feature has an entry in `FEATURES.md`; #32 has no active
  generator or what-if comparison. Imported unaccepted suggestions stay drafts.
- Original save corpus imports, stays editable, exports, and reimports; compare
  states at every historical moment, not just object counts.
- All build, model/storage/tutorial, API, and browser checks pass on the exact
  candidate. Record physical-device/accessibility limitations honestly.
- Existing account login/password/recovery works without a credential migration.
  Old tabs receive a recoverable update-required response after conversion.
- New writes survive reload, offline recovery, multiple tabs, account switching,
  and interrupted requests. Both sides of conflicts remain recoverable.
- Tutorial teaching/authoring/Play, draft persistence, and owner-scoped sync pass.
- Build output is `dist/`; the generated `_routes.json` includes only `/api/*`.
  CSP uses script hashes. Inline-script/eval exceptions must not be added to make
  a failing test pass.
- If a user-visible failure remains unresolved, do not mark the PR release-ready.

## Cutover

1. Finish all candidate and staging checks, then take the final D1 backup.
2. Configure Pages build command `npm run build:workshop`, output `dist`, and root
   Functions directory. Record previous settings. Coordinate this change with
   the merge so an intervening old-source build cannot fail unexpectedly.
3. Merge the reviewed, tested candidate into the existing production-linked
   branch. Preserve history; do not reset the branch to an unrelated ZIP commit.
4. Watch the deployment to successful completion and verify its source SHA.
   Check `release.json`, HTML checksum, cache headers, CSP, API routing, and
   absence of source/test/backup paths from public hosting.
5. On the canonical origin, smoke-test a dedicated synthetic account: login,
   old-format fixture migration, existing history, write/reload, second-device
   sync, original JSON import, JSON export/reimport, tutorial practice, authoring
   and Play. Do not edit a real user's stories for a smoke test.
6. Keep the archived source excluded from all deployments. Record production
   deployment ID/URL, commit, database bookmark, and final checks.

## Rollback without losing new-format writing

- Before any account has converted, restoring the prior deployment is possible
  after confirming no Workshop writes occurred.
- After conversion, **do not redeploy the unmodified old frontend/API against
  the live database**. It cannot safely consume Workshop records, and its API
  lacks the new-format downgrade guard.
- Prefer a forward fix or a last-known-good Workshop deployment with the same
  writer-5 API and owner checks. Keep the current D1 database and revisions.
- For a severe data-integrity incident, contain writes using the platform's
  controlled maintenance mechanism, export current data, retain device recovery
  copies, and investigate on an isolated restore. Never overwrite the live DB
  with the pre-cutover backup while newer writing exists.
- The preserved original is source/history recovery, not a universal runtime
  rollback target. Export recovery tooling must remain available for converted
  accounts. Record the actual containment/rollback procedure in staging before
  production release.
