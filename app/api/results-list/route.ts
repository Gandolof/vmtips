import { getAllMatches } from "../../../lib/queries";

export async function GET() {
  try {
    const rows = getAllMatches();
    return Response.json(rows);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Kunde inte läsa in matcherna",
      },
      { status: 500 }
    );
  }
}
