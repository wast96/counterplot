import { requireUser } from "../_lib/auth.js";
import { assertSameOrigin, errorResponse, json, readJson } from "../_lib/http.js";

const MAX_WORKSPACE_BYTES = 5_000_000;

function workspaceResponse(row) {
  return {
    workspace: row ? JSON.parse(row.workspace_json) : null,
    revision: row?.revision || 0,
    updatedAt: row?.updated_at || null
  };
}

export async function onRequestGet(context) {
  try {
    const user = await requireUser(context);
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
    const response = workspaceResponse(row);
    return json(response, 200, { ETag: `"${response.revision}"` });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPut(context) {
  try {
    assertSameOrigin(context.request);
    const user = await requireUser(context);
    const body = await readJson(context.request, MAX_WORKSPACE_BYTES + 32_768);
    if (!body?.workspace || typeof body.workspace !== "object" || !Number.isInteger(body.revision) || body.revision < 0 || typeof body.writeId !== "string" || !body.writeId || body.writeId.length > 100) {
      return json({ error: "Invalid workspace save" }, 400);
    }
    const workspaceJson = JSON.stringify(body.workspace);
    if (new TextEncoder().encode(workspaceJson).byteLength > MAX_WORKSPACE_BYTES) return json({ error: "Workspace is too large" }, 413);

    const current = await context.env.DB.prepare(`
      SELECT workspace_json, revision, last_write_id, updated_at FROM workspaces WHERE user_id = ?
    `).bind(user.id).first();
    if (current?.last_write_id === body.writeId) return json({ ok: true, revision: current.revision });
    const expected = current?.revision || 0;
    if (body.revision !== expected) return json(workspaceResponse(current), 409);

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
      `).bind(user.id, user.id)
    ]);
    if (!results[0].meta?.changes) {
      const latest = await context.env.DB.prepare(`
        SELECT workspace_json, revision, last_write_id, updated_at FROM workspaces WHERE user_id = ?
      `).bind(user.id).first();
      if (latest?.last_write_id === body.writeId) return json({ ok: true, revision: latest.revision });
      return json(workspaceResponse(latest), 409);
    }

    return json({ ok: true, revision, updatedAt: now }, 200, { ETag: `"${revision}"` });
  } catch (error) {
    return errorResponse(error);
  }
}
