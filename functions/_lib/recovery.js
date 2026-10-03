import { hashPassword, validatePassword } from "./auth.js";
import { json } from "./http.js";

// Additive and idempotent: the existing D1 binding can provision this on first use.
// Keep in sync with migrations/0002_recovery_codes.sql.
export const RECOVERY_SCHEMA = `CREATE TABLE IF NOT EXISTS recovery_codes (
  user_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT,
  PRIMARY KEY (user_id, code_hash),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`;

export async function ensureRecovery(env) {
  await env.DB.prepare(RECOVERY_SCHEMA).run();
}

export async function recoveryHash(userId, code) {
  const normalized = String(code || "").replace(/[\s-]/g, "").toLowerCase();
  const bytes = new TextEncoder().encode(`${userId}:${normalized}`);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
}

export function makeRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("").match(/.{8}/g).join("-");
}

export async function rotateRecoveryCodes(env, userId) {
  await ensureRecovery(env);
  const codes = Array.from({ length: 8 }, makeRecoveryCode);
  const timestamp = new Date().toISOString();
  const statements = [env.DB.prepare("DELETE FROM recovery_codes WHERE user_id = ?").bind(userId)];
  for (const code of codes) statements.push(env.DB.prepare("INSERT INTO recovery_codes (user_id, code_hash, created_at) VALUES (?, ?, ?)").bind(userId, await recoveryHash(userId, code), timestamp));
  await env.DB.batch(statements);
  return codes;
}

export async function resetWithCode(env, user, code, password) {
  const problem = validatePassword(password);
  if (problem) throw json({ error: problem }, 400);
  const hash = await recoveryHash(user.id, code);
  const derived = await hashPassword(password, undefined, undefined, env.AUTH_PEPPER || "");
  // The unique claim is used by every following statement in the transaction.
  // Concurrent requests cannot both consume a code or overwrite the winner's password.
  const claim = crypto.randomUUID();
  const results = await env.DB.batch([
    env.DB.prepare("UPDATE recovery_codes SET used_at = ? WHERE user_id = ? AND code_hash = ? AND used_at IS NULL").bind(claim, user.id, hash),
    env.DB.prepare(`UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?, updated_at = ?
      WHERE id = ? AND EXISTS (SELECT 1 FROM recovery_codes WHERE user_id = ? AND code_hash = ? AND used_at = ?)`)
      .bind(derived.hash, derived.salt, derived.iterations, new Date().toISOString(), user.id, user.id, hash, claim),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ? AND EXISTS
      (SELECT 1 FROM recovery_codes WHERE user_id = ? AND code_hash = ? AND used_at = ?)`)
      .bind(user.id, user.id, hash, claim)
  ]);
  return Boolean(results[0].meta?.changes);
}
