function getUserId(request) {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!email) return null;
  return email.toLowerCase();
}

export async function onRequestGet(context) {
  const userId = getUserId(context.request);

  if (!userId) {
    return Response.json(
      { error: "Not signed in" },
      { status: 401 }
    );
  }

  const row = await context.env.DB
    .prepare(`
      SELECT data, updated_at
      FROM workspaces
      WHERE user_id = ?
    `)
    .bind(userId)
    .first();

  if (!row) {
    return Response.json({
      data: null,
      updatedAt: null
    });
  }

  return Response.json({
    data: JSON.parse(row.data),
    updatedAt: row.updated_at
  });
}

export async function onRequestPut(context) {
  const userId = getUserId(context.request);

  if (!userId) {
    return Response.json(
      { error: "Not signed in" },
      { status: 401 }
    );
  }

  let body;

  try {
    body = await context.request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  if (!body || typeof body.data !== "object") {
    return Response.json(
      { error: "Invalid workspace" },
      { status: 400 }
    );
  }

  const data = JSON.stringify(body.data);
  const updatedAt = new Date().toISOString();

  await context.env.DB
    .prepare(`
      INSERT INTO workspaces (
        user_id,
        data,
        updated_at
      )
      VALUES (?, ?, ?)
      ON CONFLICT(user_id)
      DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `)
    .bind(userId, data, updatedAt)
    .run();

  return Response.json({
    ok: true,
    updatedAt
  });
}
