import { currentUser, verifyPassword, ensureLoginAllowed, recordLoginFailure, clearLoginFailures, loginRateKey } from "../../_lib/auth.js";
import { ensureRecovery, rotateRecoveryCodes } from "../../_lib/recovery.js";
import { assertSameOrigin, errorResponse, json, readJson } from "../../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const user = await currentUser(context.request, context.env);
    if (!user) return json({ error: "Not signed in" }, 401);
    await ensureRecovery(context.env);
    const row = await context.env.DB.prepare("SELECT COUNT(*) AS remaining FROM recovery_codes WHERE user_id = ? AND used_at IS NULL").bind(user.id).first();
    return json({ remaining: row.remaining });
  } catch (error) { return errorResponse(error); }
}

export async function onRequestPost(context) {
  try {
    assertSameOrigin(context.request);
    const user = await currentUser(context.request, context.env);
    if (!user) return json({ error: "Not signed in" }, 401);
    const body = await readJson(context.request, 4096);
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request" }, 400);
    const key = await loginRateKey(context.request, `recovery-enroll:${user.id}`);
    await ensureLoginAllowed(context.env, key);
    const row = await context.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
    if (typeof body.password !== "string" || body.password.length > 1024 || !await verifyPassword(body.password, row, context.env.AUTH_PEPPER || "")) {
      await recordLoginFailure(context.env, key);
      return json({ error: "Password did not match" }, 401);
    }
    await clearLoginFailures(context.env, key);
    return json({ codes: await rotateRecoveryCodes(context.env, user.id) });
  } catch (error) { return errorResponse(error); }
}
