-- Additive. Existing workspace rows and historical snapshots remain readable.
CREATE TABLE IF NOT EXISTS workspace_chunks (
  user_id TEXT NOT NULL,
  hash TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, hash),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
