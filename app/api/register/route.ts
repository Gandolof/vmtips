import bcrypt from "bcrypt";
import { db } from "../../../lib/db";
import { isConfiguredAdminEmail } from "../../../lib/admin-users";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name || !email || !password) {
      return Response.json(
        { error: "Namn, e-post och lösenord måste fyllas i" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return Response.json(
        { error: "Lösenordet måste vara minst 4 tecken" },
        { status: 400 }
      );
    }

    const existing = db.prepare(`
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
    `).get(email);

    if (existing) {
      return Response.json(
        { error: "Det finns redan ett konto med den e-postadressen" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const role = isConfiguredAdminEmail(email) ? "ADMIN" : "USER";

    const result = db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run(name, email, hashedPassword, role);

    return Response.json({
      message: "Kontot har skapats",
      userId: Number(result.lastInsertRowid),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Kunde inte skapa kontot",
      },
      { status: 500 }
    );
  }
}
