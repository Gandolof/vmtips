import { db } from "../../../../lib/db";
import { getSettings, predictionsAreLocked } from "../../../../lib/queries";
import { requireAdminFromRequest } from "../../../../lib/require-admin";

export async function GET(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const settings = getSettings();

    return Response.json({
      settings,
      locked: predictionsAreLocked(),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Kunde inte läsa in inställningarna" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const predictionsLockAt = String(body.predictionsLockAt || "").trim();

    if (!predictionsLockAt) {
      return Response.json({ error: "predictionsLockAt måste fyllas i" }, { status: 400 });
    }

    const existing = db
      .prepare(
        `
        SELECT id
        FROM settings
        ORDER BY id ASC
        LIMIT 1
      `
      )
      .get() as { id: number } | undefined;

    if (existing) {
      db.prepare(
        `
        UPDATE settings
        SET predictions_lock_at = ?
        WHERE id = ?
      `
      ).run(predictionsLockAt, existing.id);
    } else {
      db.prepare(
        `
        INSERT INTO settings (predictions_lock_at)
        VALUES (?)
      `
      ).run(predictionsLockAt);
    }

    return Response.json({ message: "Låstiden har uppdaterats" });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Kunde inte uppdatera inställningarna" },
      { status: 500 }
    );
  }
}
