import { clearMatchResult, saveMatchResult } from "../../../lib/queries";
import { requireAdminFromRequest } from "../../../lib/require-admin";

export async function POST(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();

    const matchId = Number(body.matchId);
    const actualHomeScore = Number(body.actualHomeScore);
    const actualAwayScore = Number(body.actualAwayScore);

    if (
      Number.isNaN(matchId) ||
      Number.isNaN(actualHomeScore) ||
      Number.isNaN(actualAwayScore)
    ) {
      return Response.json({ error: "Ogiltig inmatning" }, { status: 400 });
    }

    saveMatchResult(matchId, actualHomeScore, actualAwayScore);

    return Response.json({
      message: "Resultatet har sparats och poängen har räknats om",
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Kunde inte spara resultatet",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const matchId = Number(body.matchId);

    if (Number.isNaN(matchId)) {
      return Response.json({ error: "Ogiltig inmatning" }, { status: 400 });
    }

    clearMatchResult(matchId);

    return Response.json({
      message: "Resultatet har tagits bort och poängen har nollställts",
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Kunde inte ta bort resultatet",
      },
      { status: 400 }
    );
  }
}
