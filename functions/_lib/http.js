export function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export function assertSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw json({ error: "Cross-site request rejected" }, 403);
  }
}

export async function readJson(request, maxBytes = 2_000_000) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > maxBytes) throw json({ error: "Request too large" }, 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw json({ error: "Request too large" }, 413);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw json({ error: "Invalid JSON" }, 400);
  }
}

export function errorResponse(error) {
  if (error instanceof Response) return error;
  console.error("Counterplot API error", error);
  return json({ error: "Server unavailable" }, 500);
}
