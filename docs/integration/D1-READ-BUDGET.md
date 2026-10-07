# D1 upload read budget

Production query insights on 2026-10-07 showed 3.84 million rows read by
`DELETE FROM workspace_chunks` and 2.65 million by the temporary-upload
`SUM(length(CAST(content AS BLOB)))` query. The cleanup deleted no rows.
Both queries expanded all retained chunk manifests for each new upload part.

Upload capacity now uses a per-owner pending-byte counter and a pending-part
ledger. SQLite triggers update both in the same transaction as inserting or
deleting a part. A guarded insert enforces the existing 64,000,000-byte staging
limit even for concurrent requests. Publishing acknowledges only the committed
manifest's parts in the same transaction as the workspace and recovery revision.
Failed, conflicting, and replayed writes preserve correct accounting.

Full reference reconciliation runs at most once per hour per active owner,
using a persistent timestamp advanced in the same transaction as cleanup. It
bootstraps existing records, excludes current and retained historical parts,
and collects abandoned parts only after 24 hours. Parts released by history
pruning enter accounting at the next hourly pass. A failed maintenance batch
rolls back its timestamp, so the next request can retry. The schema is additive,
installed idempotently by the runtime; migration 0004 provides the same schema
for managed migration runners. Existing account, workspace, and revision formats
are unchanged. No database replacement or secret rotation is needed.

Validation includes actual SQLite transactions/triggers, pre-upgrade records,
UTF-8 byte accounting, two concurrent uploads at the capacity boundary, duplicate
retries, failed acknowledgement rollback, successful/replayed/conflicting saves,
history preservation, pruning, expiry, and other-owner isolation. A 100-part
upload performs two history reference scans instead of 200, while per-part
quota queries use a single indexed owner record. This counts query executions;
production row-read savings must be measured in Cloudflare after rollout.

After merge, confirm the Pages production deployment uses the merged commit.
Once the free-tier allowance resets (or billing is upgraded), verify sign-in,
save/reload, and a historical revision. Compare D1 query insights for the next
UTC day: per-part full-history usage scans should disappear, and reconciliation
should occur no more than hourly per active owner. Today's exhausted allowance
does not reset merely because this fix is deployed.
