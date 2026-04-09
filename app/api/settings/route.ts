import { getSettings, predictionsAreLocked } from "../../../lib/queries";

export async function GET() {
  try {
    const settings = getSettings();

    return Response.json({
      settings,
      locked: predictionsAreLocked(),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Kunde inte läsa in inställningarna",
      },
      { status: 500 }
    );
  }
}
