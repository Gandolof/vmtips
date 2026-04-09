import { db } from "../../../lib/db";
import { initDb } from "../../../lib/init-db";
import { ensureTournamentBootstrap } from "../../../lib/tournament-bootstrap";

export async function GET() {
  initDb();
  ensureTournamentBootstrap(db);

  const teamsCount = (
    db.prepare("SELECT COUNT(*) as count FROM teams").get() as { count: number }
  ).count;
  const matchesCount = (
    db.prepare("SELECT COUNT(*) as count FROM matches").get() as { count: number }
  ).count;

  return Response.json({
    message: "Turneringsdata har lagts in",
    teams: teamsCount,
    matches: matchesCount,
  });
}
