import { assertSameOrigin, errorResponse, json, readJson } from "../../_lib/http.js";
import { createSession, hashPassword, newUserId, normalizeEmail, validatePassword } from "../../_lib/auth.js";

export async function onRequestPost(context) {
  try {
    assertSameOrigin(context.request);
    const body = await readJson(context.request, 16_384);
    const email = normalizeEmail(body.email);
    const passwordProblem = validatePassword(body.password);
    if (!email || passwordProblem) return json({ error: passwordProblem || "Enter a valid email address." }, 400);
    if (context.env.REGISTRATION_CODE && body.registrationCode !== context.env.REGISTRATION_CODE) {
      return json({ error: "A valid registration code is required." }, 403);
    }

    const existing = await context.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) return json({ error: "An account already exists for this email." }, 409);

    const id = newUserId();
    const now = new Date().toISOString();
    const password = await hashPassword(body.password, undefined, undefined, context.env.AUTH_PEPPER || "");
    try {
      await context.env.DB.prepare(`
        INSERT INTO users (id, email, password_hash, password_salt, password_iterations, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(id, email, password.hash, password.salt, password.iterations, now, now).run();
    } catch (error) {
      if (String(error).includes("UNIQUE")) return json({ error: "An account already exists for this email." }, 409);
      throw error;
    }
    const cookie = await createSession(context.env, id);
    return json({ user: id, email }, 201, { "Set-Cookie": cookie });
  } catch (error) {
    return errorResponse(error);
  }
}
