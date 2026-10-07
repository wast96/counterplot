import { requireUser } from "../_lib/auth.js";
import { assertSameOrigin, errorResponse, json, readJson } from "../_lib/http.js";

import { ensureStorage, readManifest, responseFor, requireWriter } from "../_lib/workspace-storage.js";
import { validateWorkspace } from "../_lib/workspace-validation.js";
import { validateWorkshop } from "../_lib/workshop-validation.js";
import { acknowledgeChunks, maintainChunks } from "../_lib/chunk-maintenance.js";

export async function onRequestGet(context) {
  try {
    const user = await requireUser(context);
    await ensureStorage(context.env);
    const revision = new URL(context.request.url).searchParams.get("revision");
    let row;
    if (revision !== null) {
      if (!/^\d+$/.test(revision)) return json({ error: "Invalid revision" }, 400);
      row = await context.env.DB.prepare(`
        SELECT workspace_json, revision, updated_at FROM workspace_revisions
        WHERE user_id = ? AND revision = ?
      `).bind(user.id, Number(revision)).first();
      if (!row) return json({ error: "Revision not found" }, 404);
    } else {
      row = await context.env.DB.prepare(`
        SELECT workspace_json, revision, updated_at FROM workspaces WHERE user_id = ?
      `).bind(user.id).first();
      const etag = `"${row?.revision || 0}"`;
      if (context.request.headers.get("If-None-Match") === etag) {
        return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": "no-store" } });
      }
    }
    const response = await responseFor(context.env, user.id, row);
    if (revision === null && response.workspace?.format === 'counterplot-workshop' && Number(context.request.headers.get('X-Counterplot-Writer')) < 5) {
      return json({error:'This account now uses Counterplot Workshop. Export unsynced writing from this old tab, then reload.',code:'update-required'},426);
    }
    return json(response, 200, { ETag: `"${response.revision}"` });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPut(context) {
  try {
    assertSameOrigin(context.request);
    const user = await requireUser(context);
    await ensureStorage(context.env);
    requireWriter(context.request, user);
    await maintainChunks(context.env, user.id);
    const body = await readJson(context.request, 5_032_768);
    if (!body || !Number.isInteger(body.revision) || body.revision < 0 || typeof body.writeId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(body.writeId)) return json({ error: 'Invalid workspace save' }, 400);
    const incoming = body.manifest ? await readManifest(context.env, user.id, body.manifest) : body.workspace;
    const workshop = incoming?.format === 'counterplot-workshop';
    try { workshop ? validateWorkshop(incoming) : validateWorkspace(incoming); } catch (error) { return json({ error: error.message, code: 'invalid-save' }, 400); }
    const workspaceJson = JSON.stringify(body.manifest ? { storage: 'chunks-v1', format: incoming.format, schema: incoming.schema, manifest: body.manifest } : incoming);

    const current = await context.env.DB.prepare(`
      SELECT workspace_json, revision, last_write_id, updated_at FROM workspaces WHERE user_id = ?
    `).bind(user.id).first();
    if (current?.last_write_id === body.writeId) return json({ ok: true, owner: user.id, revision: current.revision });
    const expected = current?.revision || 0;
    const writer = Number(context.request.headers.get("X-Counterplot-Writer") || 2);
    const currentMetadata = current ? JSON.parse(current.workspace_json) : {};
    const currentSchema = currentMetadata.schema || 0;
    if ((workshop && writer !== 5) || (currentMetadata.format === 'counterplot-workshop' && !workshop) || (!workshop && (!Number.isInteger(writer) || writer < currentSchema || incoming.schema > writer || incoming.schema < currentSchema))) {
      return json({ error: "Update Counterplot before saving. Your local edits are retained." }, 426);
    }
    if (!(workshop ? [2] : [1, 2, 3]).includes(incoming.schema) || !Array.isArray(incoming.projects) || !incoming.projects.length) {
      return json({ error: "Unsupported workspace format" }, 400);
    }
    if (body.revision !== expected) return json(await responseFor(context.env, user.id, current), 409);

    const revision = expected + 1;
    const now = new Date().toISOString();
    const write = current
      ? context.env.DB.prepare(`
          UPDATE workspaces SET workspace_json = ?, revision = ?, last_write_id = ?, updated_at = ?
          WHERE user_id = ? AND revision = ?
        `).bind(workspaceJson, revision, body.writeId, now, user.id, expected)
      : context.env.DB.prepare(`
          INSERT INTO workspaces (user_id, workspace_json, revision, last_write_id, updated_at)
          VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO NOTHING
        `).bind(user.id, workspaceJson, revision, body.writeId, now);
    // D1 batches are transactional: the current save and recovery copy commit together.
    const results = await context.env.DB.batch([
      write,
      context.env.DB.prepare(`
        INSERT INTO workspace_revisions (user_id, revision, workspace_json, write_id, updated_at)
        SELECT user_id, revision, workspace_json, last_write_id, updated_at FROM workspaces
        WHERE user_id = ? AND revision = ? AND last_write_id = ?
        ON CONFLICT(user_id, revision) DO NOTHING
      `).bind(user.id, revision, body.writeId),
      context.env.DB.prepare(`
        DELETE FROM workspace_revisions WHERE user_id = ? AND revision NOT IN (
          SELECT revision FROM workspace_revisions WHERE user_id = ? ORDER BY revision DESC LIMIT 100
        )
      `).bind(user.id, user.id),
      acknowledgeChunks(context.env, user.id, revision, body.writeId)
    ]);
    if (!results[0].meta?.changes) {
      const latest = await context.env.DB.prepare(`
        SELECT workspace_json, revision, last_write_id, updated_at FROM workspaces WHERE user_id = ?
      `).bind(user.id).first();
      if (latest?.last_write_id === body.writeId) return json({ ok: true, owner: user.id, revision: latest.revision });
      return json(await responseFor(context.env, user.id, latest), 409);
    }

    return json({ ok: true, owner: user.id, revision, updatedAt: now }, 200, { ETag: `"${revision}"` });
  } catch (error) {
    return errorResponse(error);
  }
}
