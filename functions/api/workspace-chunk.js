import { requireUser } from '../_lib/auth.js';
import { assertSameOrigin, errorResponse, json, readJson } from '../_lib/http.js';
import { CHUNK_BYTES, digest, ensureStorage, requireWriter } from '../_lib/workspace-storage.js';
import { clearTemporaryChunks, maintainChunks, MAX_PENDING_BYTES } from '../_lib/chunk-maintenance.js';

export async function onRequestPost(context) {
  try {
    assertSameOrigin(context.request);
    const user = await requireUser(context); requireWriter(context.request, user);
    const body = await readJson(context.request, CHUNK_BYTES * 6 + 1024);
    if (typeof body?.content !== 'string' || new TextEncoder().encode(body.content).byteLength > CHUNK_BYTES ||
        typeof body.hash !== 'string' || await digest(body.content) !== body.hash) return json({ error: 'Invalid save part' }, 400);
    await ensureStorage(context.env);
    await maintainChunks(context.env, user.id);
    const existing = await context.env.DB.prepare('SELECT hash FROM workspace_chunks WHERE user_id = ? AND hash = ?').bind(user.id, body.hash).first();
    if (existing) {
      await context.env.DB.prepare('UPDATE workspace_chunks SET created_at = ? WHERE user_id = ? AND hash = ?').bind(new Date().toISOString(), user.id, body.hash).run();
      return json({ owner: user.id, hash: body.hash });
    }
    // The quota check, chunk insert, and pending-byte trigger are one atomic SQL
    // operation. Concurrent uploads cannot both consume the last available bytes.
    const inserted = await context.env.DB.prepare(`INSERT INTO workspace_chunks (user_id, hash, content, created_at)
      SELECT ?, ?, ?, ? WHERE (SELECT pending_bytes FROM workspace_chunk_usage WHERE user_id = ?) + ? <= ?
      ON CONFLICT(user_id, hash) DO NOTHING`)
      .bind(user.id, body.hash, body.content, new Date().toISOString(), user.id,
        new TextEncoder().encode(body.content).byteLength, MAX_PENDING_BYTES).run();
    if (!inserted.meta?.changes) {
      const raced = await context.env.DB.prepare('SELECT hash FROM workspace_chunks WHERE user_id = ? AND hash = ?').bind(user.id, body.hash).first();
      if (!raced) return json({ error: 'Temporary upload storage is full. Your writing is retained locally. Open Account & sync settings and choose “Clear temporary uploads & save latest” to save now.', code: 'capacity' }, 413);
    }
    return json({ owner: user.id, hash: body.hash });
  } catch (error) { return errorResponse(error); }
}

export async function onRequestDelete(context) {
  try {
    assertSameOrigin(context.request);
    const user = await requireUser(context); requireWriter(context.request, user);
    await ensureStorage(context.env);
    const cleared = await clearTemporaryChunks(context.env, user.id);
    return json({ owner: user.id, cleared });
  } catch (error) { return errorResponse(error); }
}
