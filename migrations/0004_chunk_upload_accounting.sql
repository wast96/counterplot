-- Additive upload accounting. Runtime also installs this idempotently.
CREATE TABLE IF NOT EXISTS workspace_chunk_usage (
    user_id TEXT PRIMARY KEY, pending_bytes INTEGER NOT NULL DEFAULT 0,
    cleanup_at TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS workspace_pending_chunks (
    user_id TEXT NOT NULL, hash TEXT NOT NULL, bytes INTEGER NOT NULL,
    PRIMARY KEY (user_id, hash),
    FOREIGN KEY (user_id, hash) REFERENCES workspace_chunks(user_id, hash) ON DELETE CASCADE
  );

CREATE TRIGGER IF NOT EXISTS workspace_pending_chunk_added
    AFTER INSERT ON workspace_pending_chunks BEGIN
      UPDATE workspace_chunk_usage SET pending_bytes = pending_bytes + NEW.bytes
      WHERE user_id = NEW.user_id;
    END;

CREATE TRIGGER IF NOT EXISTS workspace_pending_chunk_removed
    AFTER DELETE ON workspace_pending_chunks BEGIN
      UPDATE workspace_chunk_usage SET pending_bytes = pending_bytes - OLD.bytes
      WHERE user_id = OLD.user_id;
    END;

CREATE TRIGGER IF NOT EXISTS workspace_chunk_staged
    AFTER INSERT ON workspace_chunks BEGIN
      INSERT INTO workspace_chunk_usage (user_id) VALUES (NEW.user_id)
        ON CONFLICT(user_id) DO NOTHING;
      INSERT INTO workspace_pending_chunks (user_id, hash, bytes)
        VALUES (NEW.user_id, NEW.hash, length(CAST(NEW.content AS BLOB)));
    END;

CREATE INDEX IF NOT EXISTS workspace_chunks_by_age ON workspace_chunks(user_id, created_at);
