import { assertSameOrigin, errorResponse, json, readJson } from "../../_lib/http.js";
import { clearLoginFailures, createSession, ensureLoginAllowed, loginRateKey, normalizeEmail, recordLoginFailure, verifyPassword } from "../../_lib/auth.js";

export async function onRequestPost(context) {
  try {
    assertSameOrigin(context.request);
    const body = await readJson(context.request, 16_384);
    const email = normalizeEmail(body.email);
    const key = await loginRateKey(context.request, email || "invalid");
    await ensureLoginAllowed(context.env, key);
    const user = email ? await context.env.DB.prepare(`
      SELECT id, email, password_hash, password_salt, password_iterations
      FROM users WHERE email = ? AND disabled_at IS NULL
    `).bind(email).first() : null;
    if (!user || !(await verifyPassword(String(body.password || ""), user, context.env.AUTH_PEPPER || ""))) {
      await recordLoginFailure(context.env, key);
      return json({ error: "Invalid email or password." }, 401);
    }
    await clearLoginFailures(context.env, key);
    const cookie = await createSession(context.env, user.id);
    return json({ user: user.id, email: user.email }, 200, { "Set-Cookie": cookie });
  } catch (error) {
    return errorResponse(error);
  }
}
