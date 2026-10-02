import { requireUser } from "../_lib/auth.js";
import { errorResponse, json } from "../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const user = await requireUser(context);
    const result = await context.env.DB.prepare(`
      SELECT revision, updated_at AS updatedAt FROM workspace_revisions
      WHERE user_id = ? ORDER BY revision DESC LIMIT 30
    `).bind(user.id).all();
    return json({ revisions: result.results || [] });
  } catch (error) {
    return errorResponse(error);
  }
}
