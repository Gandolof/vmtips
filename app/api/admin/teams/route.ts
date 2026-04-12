import { db } from "../../../../lib/db";
import { requireAdminFromRequest } from "../../../../lib/require-admin";
import { displayTeamName } from "../../../../lib/team-names";

export async function GET(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const teams = db
      .prepare(
        `
        SELECT *
        FROM teams
        ORDER BY group_name ASC, name ASC
      `
      )
      .all();

    return Response.json(
      (teams as Array<any>).map((team) => ({
        ...team,
        name: displayTeamName(team.name),
      }))
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Kunde inte läsa in lagen" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const code = String(body.code || "").trim();
    const groupName = String(body.groupName || "").trim();

    if (!name || !code) {
      return Response.json({ error: "Namn och kod måste fyllas i" }, { status: 400 });
    }

    const existing = db
      .prepare(
        `
        SELECT id
        FROM teams
        WHERE code = ?
      `
      )
      .get(code);

    if (existing) {
      return Response.json({ error: "Lagkoden finns redan" }, { status: 400 });
    }

    const result = db
      .prepare(
        `
        INSERT INTO teams (name, code, group_name)
        VALUES (?, ?, ?)
      `
      )
      .run(name, code, groupName || null);

    return Response.json({
      message: "Laget har skapats",
      id: Number(result.lastInsertRowid),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Kunde inte skapa laget" },
      { status: 500 }
    );
  }
}
