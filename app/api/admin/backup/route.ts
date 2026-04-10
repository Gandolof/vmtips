import {
  attachAndRestoreFromBackup,
  createBackup,
  getBackupByFilename,
  getBackupEntries,
  getLatestBackup,
  readBackupFile,
} from "../../../../lib/db-backups";
import { requireAdminFromRequest } from "../../../../lib/require-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const backups = getBackupEntries();
    const latestBackup = getLatestBackup();
    const filename = searchParams.get("filename");

    if (searchParams.get("download") === "1") {
      const backupToDownload = filename ? getBackupByFilename(filename) : latestBackup;

      if (!backupToDownload) {
        return Response.json({ error: "Det finns ingen backup att ladda ner." }, { status: 404 });
      }

      const file = readBackupFile(backupToDownload.fullPath);

      return new Response(file, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${backupToDownload.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return Response.json(
      { latestBackup, backups },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Kunde inte läsa backup-informationen",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const backup = createBackup();
    return Response.json({ message: "Backup skapad", backup, backups: getBackupEntries() });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Kunde inte skapa backup",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const auth = requireAdminFromRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const filename = String(body.filename || "").trim();

    if (!filename) {
      return Response.json({ error: "Backupfil måste anges." }, { status: 400 });
    }

    const restoredBackup = attachAndRestoreFromBackup(filename);
    return Response.json({
      message: `Backup återställd: ${restoredBackup.filename}`,
      backup: restoredBackup,
      backups: getBackupEntries(),
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Kunde inte återställa backup",
      },
      { status: 500 }
    );
  }
}
