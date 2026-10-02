PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  disabled_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_by_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS workspaces (
  user_id TEXT PRIMARY KEY,
  workspace_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  last_write_id TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_revisions (
  user_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  workspace_json TEXT NOT NULL,
  write_id TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, revision),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS workspace_revisions_by_user
  ON workspace_revisions(user_id, revision DESC);

CREATE TABLE IF NOT EXISTS auth_attempts (
  key_hash TEXT PRIMARY KEY,
  failures INTEGER NOT NULL,
  window_started_at TEXT NOT NULL,
  blocked_until TEXT
);
