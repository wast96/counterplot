import { json } from './http.js';

export const MAX_BYTES = 32_000_000;
export const CHUNK_BYTES = 250_000;
export const STORAGE_SCHEMA = `CREATE TABLE IF NOT EXISTS workspace_chunks (
  user_id TEXT NOT NULL, hash TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, hash), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`;

export async function ensureStorage(env) { await env.DB.prepare(STORAGE_SCHEMA).run(); }
export async function digest(text) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
}
export function requireWriter(request, user) {
  if (Number(request.headers.get('X-Counterplot-Writer')) !== 4 || !request.headers.get('X-Counterplot-Owner')) {
    throw json({ error: 'Update Counterplot before saving. Export any unsynced work, then reload.', code: 'update-required' }, 426);
  }
  if (request.headers.get('X-Counterplot-Owner') !== user.id) {
    throw json({ error: 'The account changed. This tab’s writing has not been sent to the other account.', code: 'account-changed' }, 403);
  }
}
export async function readManifest(env, userId, manifest) {
  if (!manifest || !Number.isSafeInteger(manifest.bytes) || manifest.bytes < 1 || manifest.bytes > MAX_BYTES ||
      !Array.isArray(manifest.chunks) || !manifest.chunks.length || manifest.chunks.length > 1024 ||
      manifest.chunks.some(h => typeof h !== 'string' || !/^[a-f0-9]{64}$/.test(h))) {
    throw json({ error: 'Invalid workspace manifest', code: 'invalid-save' }, 400);
  }
  const contents = new Map();
  for (let i = 0; i < manifest.chunks.length; i += 80) {
    const hashes = manifest.chunks.slice(i, i + 80);
    const rows = await env.DB.prepare(`SELECT hash, content FROM workspace_chunks WHERE user_id = ? AND hash IN (${hashes.map(() => '?').join(',')})`).bind(userId, ...hashes).all();
    for (const row of rows.results) contents.set(row.hash, row.content);
  }
  let text = '', size = 0;
  for (const hash of manifest.chunks) {
    const row = contents.has(hash) ? { content: contents.get(hash) } : null;
    if (!row) throw json({ error: 'A save part is missing. Retry to finish saving.', code: 'missing-chunk' }, 409);
    size += new TextEncoder().encode(row.content).byteLength;
    if (size > MAX_BYTES) throw json({ error: 'Workspace exceeds the 32 MB supported capacity. Export a copy before reducing it.', code: 'capacity' }, 413);
    text += row.content;
  }
  if (size !== manifest.bytes) throw json({ error: 'Incomplete workspace save', code: 'invalid-save' }, 400);
  try { return JSON.parse(text); } catch { throw json({ error: 'Invalid workspace JSON', code: 'invalid-save' }, 400); }
}
export async function decodeWorkspace(env, userId, text) {
  const value = JSON.parse(text);
  return value.storage === 'chunks-v1' && !Array.isArray(value.projects) ? readManifest(env, userId, value.manifest) : value;
}
export async function responseFor(env, userId, row) {
  return { owner: userId, workspace: row ? await decodeWorkspace(env, userId, row.workspace_json) : null, revision: row?.revision || 0, updatedAt: row?.updated_at || null };
}
