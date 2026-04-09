import { db } from "../../../../lib/db";
import { requireAdminFromRequest } from "../../../../lib/require-admin";

export async function GET(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const matches = db
      .prepare(
        `
        SELECT
          matches.id,
          matches.group_name,
          matches.kickoff_at,
          matches.venue,
          matches.status,
          home.name AS home_team_name,
          away.name AS away_team_name
        FROM matches
        JOIN teams home ON home.id = matches.home_team_id
        JOIN teams away ON away.id = matches.away_team_id
        ORDER BY matches.kickoff_at ASC
      `
      )
      .all();

    const teams = db
      .prepare(
        `
        SELECT *
        FROM teams
        ORDER BY name ASC
      `
      )
      .all();

    return Response.json({ matches, teams });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Kunde inte läsa in matcherna" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();

    const groupName = String(body.groupName || "").trim();
    const homeTeamId = Number(body.homeTeamId);
    const awayTeamId = Number(body.awayTeamId);
    const kickoffAt = String(body.kickoffAt || "").trim();
    const venue = String(body.venue || "").trim();

    if (!groupName || Number.isNaN(homeTeamId) || Number.isNaN(awayTeamId) || !kickoffAt) {
      return Response.json({ error: "Obligatoriska fält saknas" }, { status: 400 });
    }

    if (homeTeamId === awayTeamId) {
      return Response.json({ error: "Hemma- och bortalag kan inte vara samma lag" }, { status: 400 });
    }

    const result = db
      .prepare(
        `
        INSERT INTO matches (
          group_name,
          home_team_id,
          away_team_id,
          kickoff_at,
          venue,
          status
        )
        VALUES (?, ?, ?, ?, ?, 'SCHEDULED')
      `
      )
      .run(groupName, homeTeamId, awayTeamId, kickoffAt, venue || null);

    return Response.json({
      message: "Matchen har skapats",
      id: Number(result.lastInsertRowid),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Kunde inte skapa matchen" },
      { status: 500 }
    );
  }
}
