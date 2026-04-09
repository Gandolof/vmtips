import bcrypt from "bcrypt";
import { db } from "../../../lib/db";
import { createSession } from "../../../lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return Response.json(
        { error: "E-post och lösenord måste fyllas i" },
        { status: 400 }
      );
    }

    const user = db.prepare(`
      SELECT id, name, email, password, role
      FROM users
      WHERE email = ?
      LIMIT 1
    `).get(email) as
      | {
          id: number;
          name: string;
          email: string;
          password: string;
          role: string;
        }
      | undefined;

    if (!user) {
      return Response.json({ error: "Felaktig inloggning" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) {
      return Response.json({ error: "Felaktig inloggning" }, { status: 401 });
    }

    const session = createSession(user.id);

    const response = Response.json({
      message: "Inloggad",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.headers.append(
      "Set-Cookie",
      `session_token=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
    );

    return response;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Inloggningen misslyckades" },
      { status: 500 }
    );
  }
}
