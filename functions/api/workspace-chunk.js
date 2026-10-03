import { requireUser } from '../_lib/auth.js';
import { assertSameOrigin, errorResponse, json, readJson } from '../_lib/http.js';
import { CHUNK_BYTES, digest, ensureStorage, requireWriter } from '../_lib/workspace-storage.js';

export async function onRequestPost(context) {
  try {
    assertSameOrigin(context.request);
    const user = await requireUser(context); requireWriter(context.request, user);
    const body = await readJson(context.request, CHUNK_BYTES * 6 + 1024);
    if (typeof body?.content !== 'string' || new TextEncoder().encode(body.content).byteLength > CHUNK_BYTES ||
        typeof body.hash !== 'string' || await digest(body.content) !== body.hash) return json({ error: 'Invalid save part' }, 400);
    await ensureStorage(context.env);
    const existing = await context.env.DB.prepare('SELECT hash FROM workspace_chunks WHERE user_id = ? AND hash = ?').bind(user.id, body.hash).first();
    if (existing) {
      await context.env.DB.prepare('UPDATE workspace_chunks SET created_at = ? WHERE user_id = ? AND hash = ?').bind(new Date().toISOString(), user.id, body.hash).run();
      return json({ owner: user.id, hash: body.hash });
    }
    // Bound abandoned uploads separately: retained revisions must never prevent a smaller save.
    const unreferenced = `user_id = ? AND hash NOT IN (SELECT part.value FROM workspace_revisions r, json_each(r.workspace_json, '$.manifest.chunks') part WHERE r.user_id = ? AND json_extract(r.workspace_json, '$.storage') = 'chunks-v1' AND json_type(r.workspace_json, '$.projects') IS NULL) AND hash NOT IN (SELECT part.value FROM workspaces w, json_each(w.workspace_json, '$.manifest.chunks') part WHERE w.user_id = ? AND json_extract(w.workspace_json, '$.storage') = 'chunks-v1' AND json_type(w.workspace_json, '$.projects') IS NULL)`;
    await context.env.DB.prepare(`DELETE FROM workspace_chunks WHERE ${unreferenced} AND created_at < ?`).bind(user.id,user.id,user.id,new Date(Date.now()-86400000).toISOString()).run();
    const usage = await context.env.DB.prepare(`SELECT COALESCE(SUM(length(CAST(content AS BLOB))), 0) AS bytes FROM workspace_chunks WHERE ${unreferenced}`).bind(user.id,user.id,user.id).first();
    if (usage.bytes + new TextEncoder().encode(body.content).byteLength > 64_000_000) return json({ error: 'Temporary upload storage is full. Your writing is retained locally. Export a backup now; unused uploads expire after one day, then saving can resume.', code: 'capacity' }, 413);
    await context.env.DB.prepare('INSERT INTO workspace_chunks (user_id, hash, content, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, hash) DO NOTHING')
      .bind(user.id, body.hash, body.content, new Date().toISOString()).run();
    return json({ owner: user.id, hash: body.hash });
  } catch (error) { return errorResponse(error); }
}
