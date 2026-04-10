import { getMatchesWithPredictions, userHasPredictionSet } from "../../../lib/queries";
import { getFifaMatchUrl } from "../../../lib/fifa-match-links";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("userId"));
    const predictionSet = Number(searchParams.get("predictionSet") || "1");

    if (Number.isNaN(userId) || Number.isNaN(predictionSet)) {
      return Response.json({ error: "Ogiltigt userId" }, { status: 400 });
    }

    const rows = getMatchesWithPredictions(userId, predictionSet);
    return Response.json({
      predictionSet,
      hasPredictions: userHasPredictionSet(userId, predictionSet),
      matches: rows.map((row: any) => ({
        ...row,
        fifa_url: getFifaMatchUrl(row),
      })),
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Kunde inte läsa in matcherna" },
      { status: 500 }
    );
  }
}
