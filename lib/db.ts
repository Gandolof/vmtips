import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { ensureTournamentBootstrap } from "./tournament-bootstrap";

const defaultDbPath = path.join(process.cwd(), "data", "worldcup.db");
const dbPath =
  process.env.DB_PATH ||
  (process.env.DB_DIR
    ? path.join(process.env.DB_DIR, "worldcup.db")
    : process.env.RAILWAY_VOLUME_MOUNT_PATH
      ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "worldcup.db")
      : defaultDbPath);
const dbDir = path.dirname(dbPath);

// Ensure the target database directory exists both locally and on Railway.
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

let initialized = false;

function ensurePredictionsTableSupportsSets() {
  const columns = db.prepare("PRAGMA table_info(predictions)").all() as Array<{
    name: string;
  }>;
  const hasPredictionSet = columns.some((column) => column.name === "prediction_set");

  if (hasPredictionSet) {
    return;
  }

  db.exec(`
    ALTER TABLE predictions RENAME TO predictions_legacy;

    CREATE TABLE predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      prediction_set INTEGER NOT NULL DEFAULT 1,
      match_id INTEGER NOT NULL,
      predicted_home_score INTEGER NOT NULL,
      predicted_away_score INTEGER NOT NULL,
      points_awarded INTEGER,
      UNIQUE(user_id, prediction_set, match_id)
    );

    INSERT INTO predictions (
      id,
      user_id,
      prediction_set,
      match_id,
      predicted_home_score,
      predicted_away_score,
      points_awarded
    )
    SELECT
      id,
      user_id,
      1,
      match_id,
      predicted_home_score,
      predicted_away_score,
      points_awarded
    FROM predictions_legacy;

    DROP TABLE predictions_legacy;
  `);
}

export function ensureDbInitialized() {
  if (initialized) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'USER'
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      group_name TEXT
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_name TEXT NOT NULL,
      home_team_id INTEGER NOT NULL,
      away_team_id INTEGER NOT NULL,
      kickoff_at TEXT NOT NULL,
      venue TEXT,
      actual_home_score INTEGER,
      actual_away_score INTEGER,
      status TEXT DEFAULT 'SCHEDULED'
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      predicted_home_score INTEGER NOT NULL,
      predicted_away_score INTEGER NOT NULL,
      points_awarded INTEGER,
      UNIQUE(user_id, match_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      predictions_lock_at TEXT NOT NULL
    );
  `);

  ensurePredictionsTableSupportsSets();
  ensureTournamentBootstrap(db);
  initialized = true;
}

ensureDbInitialized();
