import { deleteSession, expiredSessionCookie, requireUser } from "../../_lib/auth.js";
import { assertSameOrigin, errorResponse, json } from "../../_lib/http.js";

export async function onRequestPost(context) {
  try {
    assertSameOrigin(context.request);
    await requireUser(context);
    await deleteSession(context.request, context.env);
    return json({ ok: true }, 200, { "Set-Cookie": expiredSessionCookie() });
  } catch (error) {
    return errorResponse(error);
  }
}
