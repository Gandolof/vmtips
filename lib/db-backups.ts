import fs from "fs";
import path from "path";
import { db, dbDir, dbPath } from "./db";

const backupsDir = path.join(dbDir, "backups");
const MAX_BACKUPS = 5;

type BackupEntry = {
  filename: string;
  fullPath: string;
  createdAt: string;
  size: number;
};

function ensureBackupsDir() {
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
}

function buildBackupFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `worldcup-backup-${stamp}.db`;
}

export function getBackupEntries() {
  ensureBackupsDir();

  return fs
    .readdirSync(backupsDir)
    .filter((filename) => filename.endsWith(".db"))
    .map((filename) => {
      const fullPath = path.join(backupsDir, filename);
      const stats = fs.statSync(fullPath);

      return {
        filename,
        fullPath,
        createdAt: stats.mtime.toISOString(),
        size: stats.size,
      } satisfies BackupEntry;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getLatestBackup() {
  return getBackupEntries()[0] || null;
}

function trimOldBackups() {
  const backups = getBackupEntries();

  for (const backup of backups.slice(MAX_BACKUPS)) {
    fs.unlinkSync(backup.fullPath);
  }
}

export function createBackup() {
  ensureBackupsDir();

  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    // Ignore if WAL is not enabled.
  }

  const filename = buildBackupFilename();
  const fullPath = path.join(backupsDir, filename);

  fs.copyFileSync(dbPath, fullPath);

  const stats = fs.statSync(fullPath);
  const backup = {
    filename,
    fullPath,
    createdAt: stats.mtime.toISOString(),
    size: stats.size,
  } satisfies BackupEntry;

  trimOldBackups();

  return backup;
}

export function readBackupFile(fullPath: string) {
  return fs.readFileSync(fullPath);
}

export function getBackupByFilename(filename: string) {
  return getBackupEntries().find((backup) => backup.filename === filename) || null;
}

export function attachAndRestoreFromBackup(filename: string) {
  const backupToRestore = getBackupByFilename(filename);
  if (!backupToRestore) {
    throw new Error("Backupen hittades inte.");
  }

  db.exec(`ATTACH DATABASE '${backupToRestore.fullPath.replace(/'/g, "''")}' AS backup`);

  try {
    const tables = [
      "sessions",
      "predictions",
      "matches",
      "teams",
      "settings",
      "users",
    ];

    db.exec("BEGIN");

    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run();
      db.prepare(`INSERT INTO ${table} SELECT * FROM backup.${table}`).run();
    }

    const sequenceRows = db
      .prepare("SELECT name, seq FROM backup.sqlite_sequence")
      .all() as Array<{ name: string; seq: number }>;

    db.prepare("DELETE FROM sqlite_sequence").run();

    for (const row of sequenceRows) {
      db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)").run(
        row.name,
        row.seq
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.exec("DETACH DATABASE backup");
  }

  return backupToRestore;
}
