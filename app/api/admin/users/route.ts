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
        SELECT id, name, email, role, has_paid
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
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const hasPaid = body.hasPaid;

    if (Number.isNaN(userId)) {
      return Response.json(
        { error: "Användare måste anges" },
        { status: 400 }
      );
    }

    const shouldUpdateRole = ["ADMIN", "USER"].includes(role);
    const shouldUpdateName = name.length > 0;
    const shouldUpdatePaid = typeof hasPaid === "boolean";

    if (!shouldUpdateRole && !shouldUpdatePaid && !shouldUpdateName) {
      return Response.json(
        { error: "Ingen giltig uppdatering skickades" },
        { status: 400 }
      );
    }

    const existing = db
      .prepare(
        `
        SELECT id, name, role, has_paid
        FROM users
        WHERE id = ?
        LIMIT 1
      `
      )
      .get(userId) as
      | {
          id: number;
          name: string;
          role: string;
          has_paid: number;
        }
      | undefined;

    if (!existing) {
      return Response.json({ error: "Användaren hittades inte" }, { status: 404 });
    }

    if (shouldUpdateRole && existing.role === role) {
      return Response.json({
        message: role === "ADMIN" ? "Användaren är redan admin" : "Användaren är redan vanlig användare",
      });
    }

    if (shouldUpdateName && existing.name === name) {
      return Response.json({
        message: "Namnet är redan uppdaterat",
      });
    }

    if (shouldUpdatePaid && existing.has_paid === Number(hasPaid)) {
      return Response.json({
        message: hasPaid ? "Användaren är redan markerad som betald" : "Användaren är redan markerad som obetald",
      });
    }

    if (shouldUpdateRole && shouldUpdatePaid && shouldUpdateName) {
      db.prepare(
        `
        UPDATE users
        SET name = ?, role = ?, has_paid = ?
        WHERE id = ?
      `
      ).run(name, role, Number(hasPaid), userId);

      return Response.json({
        message: "Användaren har uppdaterats",
      });
    }

    if (shouldUpdateRole && shouldUpdatePaid) {
      db.prepare(
        `
        UPDATE users
        SET role = ?, has_paid = ?
        WHERE id = ?
      `
      ).run(role, Number(hasPaid), userId);

      return Response.json({
        message: "Användaren har uppdaterats",
      });
    }

    if (shouldUpdateName && shouldUpdatePaid) {
      db.prepare(
        `
        UPDATE users
        SET name = ?, has_paid = ?
        WHERE id = ?
      `
      ).run(name, Number(hasPaid), userId);

      return Response.json({
        message: "Användaren har uppdaterats",
      });
    }

    if (shouldUpdateName && shouldUpdateRole) {
      db.prepare(
        `
        UPDATE users
        SET name = ?, role = ?
        WHERE id = ?
      `
      ).run(name, role, userId);

      return Response.json({
        message: "Användaren har uppdaterats",
      });
    }

    if (shouldUpdateRole) {
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
    }

    if (shouldUpdateName) {
      db.prepare(
        `
        UPDATE users
        SET name = ?
        WHERE id = ?
      `
      ).run(name, userId);

      return Response.json({
        message: "Namnet har uppdaterats",
      });
    }

    db.prepare(
      `
      UPDATE users
      SET has_paid = ?
      WHERE id = ?
    `
    ).run(Number(hasPaid), userId);

    return Response.json({
      message: hasPaid ? "Användaren har markerats som betald" : "Användaren har markerats som obetald",
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

export async function DELETE(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const userId = Number(body.userId);

    if (Number.isNaN(userId)) {
      return Response.json({ error: "Användare måste anges" }, { status: 400 });
    }

    if (auth.session.user_id === userId) {
      return Response.json(
        { error: "Du kan inte ta bort ditt eget konto" },
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

    const tx = db.transaction(() => {
      db.prepare(
        `
        DELETE FROM sessions
        WHERE user_id = ?
      `
      ).run(userId);

      db.prepare(
        `
        DELETE FROM predictions
        WHERE user_id = ?
      `
      ).run(userId);

      db.prepare(
        `
        DELETE FROM users
        WHERE id = ?
      `
      ).run(userId);
    });

    tx();

    return Response.json({
      message: "Användaren och tillhörande tips har tagits bort",
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Kunde inte ta bort användaren",
      },
      { status: 500 }
    );
  }
}
