import { normalizeEmail, ensureLoginAllowed, recordLoginFailure, clearLoginFailures, loginRateKey, expiredSessionCookie } from "../../_lib/auth.js";
import { ensureRecovery, recoveryHash, resetWithCode } from "../../_lib/recovery.js";
import { assertSameOrigin, errorResponse, json, readJson } from "../../_lib/http.js";

export async function onRequestPost(context) {
  try {
    assertSameOrigin(context.request);
    const body = await readJson(context.request, 8192);
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request" }, 400);
    const email = normalizeEmail(body.email);
    // Bound both account-targeted and per-IP guessing, including nonexistent accounts.
    const keys = await Promise.all([loginRateKey(context.request, "recovery-reset"), loginRateKey(context.request, `recovery-reset:${email}`)]);
    for (const key of keys) await ensureLoginAllowed(context.env, key);
    const user = email ? await context.env.DB.prepare("SELECT * FROM users WHERE email = ? AND disabled_at IS NULL").bind(email).first() : null;
    await ensureRecovery(context.env);
    const code = typeof body.code === "string" && body.code.length <= 100 ? body.code : "";
    const record = user && code ? await context.env.DB.prepare("SELECT code_hash FROM recovery_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL").bind(user.id, await recoveryHash(user.id, code)).first() : null;
    if (!record || !await resetWithCode(context.env, user, code, body.password)) {
      for (const key of keys) await recordLoginFailure(context.env, key);
      return json({ error: "Email or recovery code did not match, or that code was already used." }, 400);
    }
    for (const key of keys) await clearLoginFailures(context.env, key);
    return json({ ok: true }, 200, { "Set-Cookie": expiredSessionCookie() });
  } catch (error) { return errorResponse(error); }
}
