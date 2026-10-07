// Keep upload accounting separate from retained history. All changes to the
// pending-byte counter happen in the same transaction as their chunk records.
export const MAX_PENDING_BYTES = 64_000_000;
export const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const DAY_MS = 24 * CLEANUP_INTERVAL_MS;

export const MAINTENANCE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS workspace_chunk_usage (
    user_id TEXT PRIMARY KEY, pending_bytes INTEGER NOT NULL DEFAULT 0,
    cleanup_at TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS workspace_pending_chunks (
    user_id TEXT NOT NULL, hash TEXT NOT NULL, bytes INTEGER NOT NULL,
    PRIMARY KEY (user_id, hash),
    FOREIGN KEY (user_id, hash) REFERENCES workspace_chunks(user_id, hash) ON DELETE CASCADE
  )`,
  `CREATE TRIGGER IF NOT EXISTS workspace_pending_chunk_added
    AFTER INSERT ON workspace_pending_chunks BEGIN
      UPDATE workspace_chunk_usage SET pending_bytes = pending_bytes + NEW.bytes
      WHERE user_id = NEW.user_id;
    END`,
  `CREATE TRIGGER IF NOT EXISTS workspace_pending_chunk_removed
    AFTER DELETE ON workspace_pending_chunks BEGIN
      UPDATE workspace_chunk_usage SET pending_bytes = pending_bytes - OLD.bytes
      WHERE user_id = OLD.user_id;
    END`,
  `CREATE TRIGGER IF NOT EXISTS workspace_chunk_staged
    AFTER INSERT ON workspace_chunks BEGIN
      INSERT INTO workspace_chunk_usage (user_id) VALUES (NEW.user_id)
        ON CONFLICT(user_id) DO NOTHING;
      INSERT INTO workspace_pending_chunks (user_id, hash, bytes)
        VALUES (NEW.user_id, NEW.hash, length(CAST(NEW.content AS BLOB)));
    END`,
  `CREATE INDEX IF NOT EXISTS workspace_chunks_by_age ON workspace_chunks(user_id, created_at)`
];

const prepared = new WeakMap();
export async function ensureMaintenance(env) {
  let preparation = prepared.get(env.DB);
  if (!preparation) {
    preparation = env.DB.batch(MAINTENANCE_SCHEMA.map(sql => env.DB.prepare(sql)));
    prepared.set(env.DB, preparation);
  }
  try { await preparation; } catch (error) { prepared.delete(env.DB); throw error; }
}

// Keep the original envelope guard: authored legacy extension fields are not
// manifests. Both the current workspace and every retained revision protect parts.
const referenced = `SELECT part.value FROM workspace_revisions r,
  json_each(r.workspace_json, '$.manifest.chunks') part
  WHERE r.user_id = ? AND json_extract(r.workspace_json, '$.storage') = 'chunks-v1'
    AND json_type(r.workspace_json, '$.projects') IS NULL
  UNION SELECT part.value FROM workspaces w,
  json_each(w.workspace_json, '$.manifest.chunks') part
  WHERE w.user_id = ? AND json_extract(w.workspace_json, '$.storage') = 'chunks-v1'
    AND json_type(w.workspace_json, '$.projects') IS NULL`;

export async function maintainChunks(env, userId, now = Date.now()) {
  await ensureMaintenance(env);
  const timestamp = new Date(now).toISOString();
  const cutoff = new Date(now - CLEANUP_INTERVAL_MS).toISOString();
  const expired = new Date(now - DAY_MS).toISOString();
  // A database lease prevents separate isolates/tabs from repeating the scan.
  // Cleanup and lease advancement commit together; a failed batch can be retried.
  await env.DB.prepare('INSERT INTO workspace_chunk_usage (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING').bind(userId).run();
  const due = await env.DB.prepare('SELECT cleanup_at FROM workspace_chunk_usage WHERE user_id = ?').bind(userId).first();
  if (due.cleanup_at >= cutoff) return;
  const lease = `EXISTS (SELECT 1 FROM workspace_chunk_usage WHERE user_id = ? AND cleanup_at < ?)`;
  await env.DB.batch([
    // Bootstrap existing databases, and account for parts whose last retained
    // revision was pruned since the previous maintenance pass.
    env.DB.prepare(`INSERT INTO workspace_pending_chunks (user_id, hash, bytes)
      SELECT user_id, hash, length(CAST(content AS BLOB)) FROM workspace_chunks
      WHERE user_id = ? AND ${lease} AND hash NOT IN (${referenced})
      ON CONFLICT(user_id, hash) DO NOTHING`).bind(userId, userId, cutoff, userId, userId),
    // Covers successful writes by an older deployment as well as interrupted
    // accounting upgrades. This reconciliation is hourly, never per upload part.
    env.DB.prepare(`DELETE FROM workspace_pending_chunks WHERE user_id = ?
      AND ${lease} AND hash IN (${referenced})`).bind(userId, userId, cutoff, userId, userId),
    env.DB.prepare(`DELETE FROM workspace_chunks WHERE user_id = ? AND created_at < ?
      AND ${lease} AND hash IN (SELECT hash FROM workspace_pending_chunks WHERE user_id = ?)`)
      .bind(userId, expired, userId, cutoff, userId),
    env.DB.prepare('UPDATE workspace_chunk_usage SET cleanup_at = ? WHERE user_id = ? AND cleanup_at < ?')
      .bind(timestamp, userId, cutoff)
  ]);
}

export function acknowledgeChunks(env, userId, revision, writeId) {
  // Guard by the committed write identity so a losing/conflicting save never
  // releases another upload's quota. This statement belongs in the save batch.
  return env.DB.prepare(`DELETE FROM workspace_pending_chunks WHERE user_id = ?
    AND hash IN (SELECT part.value FROM workspaces w,
      json_each(w.workspace_json, '$.manifest.chunks') part
      WHERE w.user_id = ? AND w.revision = ? AND w.last_write_id = ?
        AND json_extract(w.workspace_json, '$.storage') = 'chunks-v1'
        AND json_type(w.workspace_json, '$.projects') IS NULL)`)
    .bind(userId, userId, revision, writeId);
}
