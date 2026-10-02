import { currentUser } from "../../_lib/auth.js";
import { errorResponse, json } from "../../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const user = await currentUser(context.request, context.env);
    if (!user) return json({ error: "Not signed in" }, 401);
    return json({ user: user.id, email: user.email });
  } catch (error) {
    return errorResponse(error);
  }
}
