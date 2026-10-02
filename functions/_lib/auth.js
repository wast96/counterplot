import { json } from "./http.js";

const COOKIE = "counterplot_session";
// Cloudflare Workers currently caps native PBKDF2 at 100,000 iterations.
// Production also uses a separately stored, high-entropy AUTH_PEPPER.
const ITERATIONS = 100_000;
const SESSION_DAYS = 30;
const encoder = new TextEncoder();

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function randomToken(size = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function randomSalt(size = 16) {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(size)));
}

async function sha256(value) {
  return bytesToBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

export function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email;
}

export function validatePassword(value) {
  if (typeof value !== "string" || value.length < 12) return "Use at least 12 characters.";
  if (value.length > 1024) return "Password is too long.";
  return "";
}

export async function hashPassword(password, salt = randomSalt(), iterations = ITERATIONS, pepper = "") {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password + pepper),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: base64ToBytes(salt), iterations },
    material,
    256
  );
  return { hash: bytesToBase64(new Uint8Array(bits)), salt, iterations };
}

function constantTimeEqual(left, right) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let difference = a.length ^ b.length;
  const size = Math.max(a.length, b.length);
  for (let index = 0; index < size; index += 1) {
    difference |= (a[index] || 0) ^ (b[index] || 0);
  }
  return difference === 0;
}

export async function verifyPassword(password, user, pepper = "") {
  const result = await hashPassword(password, user.password_salt, user.password_iterations, pepper);
  return constantTimeEqual(result.hash, user.password_hash);
}

function cookieValue(request) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE) return value.join("=");
  }
  return "";
}

export async function createSession(env, userId) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(tokenHash, userId, now.toISOString(), expires.toISOString(), now.toISOString()).run();
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}`;
}

export async function deleteSession(request, env) {
  const token = cookieValue(request);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export function expiredSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function currentUser(request, env) {
  const token = cookieValue(request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const row = await env.DB.prepare(`
    SELECT users.id, users.email, sessions.last_seen_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.disabled_at IS NULL
  `).bind(tokenHash, now).first();
  if (!row) return null;
  if (!row.last_seen_at || Date.now() - Date.parse(row.last_seen_at) > 3_600_000) {
    env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?").bind(now, tokenHash).run().catch(console.error);
  }
  return { id: row.id, email: row.email };
}

export async function requireUser(context) {
  const user = await currentUser(context.request, context.env);
  if (!user) throw json({ error: "Not signed in" }, 401);
  return user;
}

export async function loginRateKey(request, email) {
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  return sha256(`${address}|${email}`);
}

export async function ensureLoginAllowed(env, key) {
  const row = await env.DB.prepare("SELECT failures, blocked_until FROM auth_attempts WHERE key_hash = ?").bind(key).first();
  if (row?.blocked_until && Date.parse(row.blocked_until) > Date.now()) {
    throw json({ error: "Too many attempts. Try again later." }, 429, { "Retry-After": "900" });
  }
}

export async function recordLoginFailure(env, key) {
  const now = new Date();
  const existing = await env.DB.prepare("SELECT failures, window_started_at FROM auth_attempts WHERE key_hash = ?").bind(key).first();
  const withinWindow = existing && Date.now() - Date.parse(existing.window_started_at) < 15 * 60_000;
  const failures = withinWindow ? existing.failures + 1 : 1;
  const start = withinWindow ? existing.window_started_at : now.toISOString();
  const blocked = failures >= 8 ? new Date(now.getTime() + 15 * 60_000).toISOString() : null;
  await env.DB.prepare(`
    INSERT INTO auth_attempts (key_hash, failures, window_started_at, blocked_until) VALUES (?, ?, ?, ?)
    ON CONFLICT(key_hash) DO UPDATE SET failures = excluded.failures, window_started_at = excluded.window_started_at, blocked_until = excluded.blocked_until
  `).bind(key, failures, start, blocked).run();
}

export async function clearLoginFailures(env, key) {
  await env.DB.prepare("DELETE FROM auth_attempts WHERE key_hash = ?").bind(key).run();
}

export function newUserId() {
  return crypto.randomUUID();
}
