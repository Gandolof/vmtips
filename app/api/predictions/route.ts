import { savePrediction, savePredictionsBulk } from "../../../lib/queries";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId = Number(body.userId);

    if (Array.isArray(body.predictions)) {
      const predictions = body.predictions.map((prediction: any) => ({
        matchId: Number(prediction.matchId),
        predictedHomeScore: Number(prediction.predictedHomeScore),
        predictedAwayScore: Number(prediction.predictedAwayScore),
      }));

      if (
        Number.isNaN(userId) ||
        predictions.some(
          (prediction) =>
            Number.isNaN(prediction.matchId) ||
            Number.isNaN(prediction.predictedHomeScore) ||
            Number.isNaN(prediction.predictedAwayScore)
        )
      ) {
        return Response.json({ error: "Ogiltig inmatning" }, { status: 400 });
      }

      savePredictionsBulk(userId, predictions);
      return Response.json({ message: "Tipsen har sparats" });
    }

    const matchId = Number(body.matchId);
    const predictedHomeScore = Number(body.predictedHomeScore);
    const predictedAwayScore = Number(body.predictedAwayScore);

    if (
      Number.isNaN(userId) ||
      Number.isNaN(matchId) ||
      Number.isNaN(predictedHomeScore) ||
      Number.isNaN(predictedAwayScore)
    ) {
      return Response.json({ error: "Ogiltig inmatning" }, { status: 400 });
    }

    savePrediction(userId, matchId, predictedHomeScore, predictedAwayScore);

    return Response.json({ message: "Tipset har sparats" });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Kunde inte spara tipset" },
      { status: 400 }
    );
  }
}
