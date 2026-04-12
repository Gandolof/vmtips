import bcrypt from "bcrypt";
import { db } from "../../../../lib/db";
import { requireAdminFromRequest } from "../../../../lib/require-admin";

export async function GET(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const users = db
      .prepare(
        `
        SELECT id, name, email, role
        FROM users
        ORDER BY name ASC
      `
      )
      .all();

    return Response.json(users);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Kunde inte läsa in användarna",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const userId = Number(body.userId);
    const password = String(body.password || "");

    if (Number.isNaN(userId) || !password) {
      return Response.json(
        { error: "Användare och nytt lösenord måste fyllas i" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return Response.json(
        { error: "Lösenordet måste vara minst 4 tecken" },
        { status: 400 }
      );
    }

    const existing = db
      .prepare(
        `
        SELECT id
        FROM users
        WHERE id = ?
        LIMIT 1
      `
      )
      .get(userId);

    if (!existing) {
      return Response.json({ error: "Användaren hittades inte" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.prepare(
      `
      UPDATE users
      SET password = ?
      WHERE id = ?
    `
    ).run(hashedPassword, userId);

    return Response.json({ message: "Lösenordet har återställts" });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Kunde inte återställa lösenordet",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const userId = Number(body.userId);
    const role = String(body.role || "").trim().toUpperCase();

    if (Number.isNaN(userId) || !["ADMIN", "USER"].includes(role)) {
      return Response.json(
        { error: "Användare och giltig roll måste anges" },
        { status: 400 }
      );
    }

    const existing = db
      .prepare(
        `
        SELECT id, role
        FROM users
        WHERE id = ?
        LIMIT 1
      `
      )
      .get(userId) as
      | {
          id: number;
          role: string;
        }
      | undefined;

    if (!existing) {
      return Response.json({ error: "Användaren hittades inte" }, { status: 404 });
    }

    if (existing.role === role) {
      return Response.json({
        message: role === "ADMIN" ? "Användaren är redan admin" : "Användaren är redan vanlig användare",
      });
    }

    db.prepare(
      `
      UPDATE users
      SET role = ?
      WHERE id = ?
    `
    ).run(role, userId);

    return Response.json({
      message: role === "ADMIN" ? "Användaren är nu admin" : "Admin-behörigheten togs bort",
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Kunde inte uppdatera rollen",
      },
      { status: 500 }
    );
  }
}
