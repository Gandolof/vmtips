import { savePredictionsBulk } from "../../../../lib/queries";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId = Number(body.userId);
    const predictions = Array.isArray(body.predictions) ? body.predictions : [];

    if (Number.isNaN(userId)) {
      return Response.json({ error: "Ogiltigt userId" }, { status: 400 });
    }

    savePredictionsBulk(
      userId,
      predictions.map((p: any) => ({
        matchId: Number(p.matchId),
        predictedHomeScore: Number(p.predictedHomeScore),
        predictedAwayScore: Number(p.predictedAwayScore),
      }))
    );

    return Response.json({ message: "Alla tips har sparats" });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Kunde inte spara tipsen" },
      { status: 400 }
    );
  }
}
