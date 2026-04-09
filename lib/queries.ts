import { db } from "./db";
import { calculatePoints } from "./scoring";

export function getSettings() {
  return db
    .prepare(
      `
      SELECT *
      FROM settings
      ORDER BY id ASC
      LIMIT 1
    `
    )
    .get() as
    | {
        id: number;
        predictions_lock_at: string;
      }
    | undefined;
}

export function predictionsAreLocked() {
  const settings = getSettings();
  if (!settings) return false;

  return new Date() >= new Date(settings.predictions_lock_at);
}

export function savePrediction(
  userId: number,
  matchId: number,
  predictedHomeScore: number,
  predictedAwayScore: number
) {
  if (predictionsAreLocked()) {
    throw new Error("Tipsen är låsta.");
  }

  db.prepare(
    `
    INSERT INTO predictions (
      user_id,
      match_id,
      predicted_home_score,
      predicted_away_score,
      points_awarded
    )
    VALUES (?, ?, ?, ?, NULL)
    ON CONFLICT(user_id, match_id)
    DO UPDATE SET
      predicted_home_score = excluded.predicted_home_score,
      predicted_away_score = excluded.predicted_away_score,
      points_awarded = NULL
  `
  ).run(userId, matchId, predictedHomeScore, predictedAwayScore);
}

export function savePredictionsBulk(
  userId: number,
  predictions: Array<{
    matchId: number;
    predictedHomeScore: number;
    predictedAwayScore: number;
  }>
) {
  if (predictionsAreLocked()) {
    throw new Error("Tipsen är låsta.");
  }

  const stmt = db.prepare(
    `
    INSERT INTO predictions (
      user_id,
      match_id,
      predicted_home_score,
      predicted_away_score,
      points_awarded
    )
    VALUES (?, ?, ?, ?, NULL)
    ON CONFLICT(user_id, match_id)
    DO UPDATE SET
      predicted_home_score = excluded.predicted_home_score,
      predicted_away_score = excluded.predicted_away_score,
      points_awarded = NULL
  `
  );

  const tx = db.transaction(() => {
    for (const p of predictions) {
      stmt.run(userId, p.matchId, p.predictedHomeScore, p.predictedAwayScore);
    }
  });

  tx();
}

export function getLeaderboard() {
  return db
    .prepare(
      `
      SELECT
        users.id,
        users.name,
        COALESCE(SUM(predictions.points_awarded), 0) AS total_points
      FROM users
      LEFT JOIN predictions ON predictions.user_id = users.id
      GROUP BY users.id, users.name
      ORDER BY total_points DESC, users.name ASC
    `
    )
    .all();
}

export function getUserById(userId: number) {
  return db
    .prepare(
      `
      SELECT id, name, email, role
      FROM users
      WHERE id = ?
      LIMIT 1
    `
    )
    .get(userId) as
    | {
        id: number;
        name: string;
        email: string | null;
        role: string;
      }
    | undefined;
}

export function saveMatchResult(
  matchId: number,
  actualHomeScore: number,
  actualAwayScore: number
) {
  db.prepare(
    `
    UPDATE matches
    SET actual_home_score = ?, actual_away_score = ?, status = 'COMPLETED'
    WHERE id = ?
  `
  ).run(actualHomeScore, actualAwayScore, matchId);

  const predictions = db
    .prepare(
      `
      SELECT *
      FROM predictions
      WHERE match_id = ?
    `
    )
    .all(matchId) as Array<{
    id: number;
    predicted_home_score: number;
    predicted_away_score: number;
  }>;

  const updateStmt = db.prepare(
    `
    UPDATE predictions
    SET points_awarded = ?
    WHERE id = ?
  `
  );

  const tx = db.transaction(() => {
    for (const p of predictions) {
      const points = calculatePoints(
        p.predicted_home_score,
        p.predicted_away_score,
        actualHomeScore,
        actualAwayScore
      );

      updateStmt.run(points, p.id);
    }
  });

  tx();
}

export function getAllMatches() {
  return db
    .prepare(
      `
      SELECT
        matches.id,
        matches.group_name,
        matches.kickoff_at,
        matches.venue,
        matches.actual_home_score,
        matches.actual_away_score,
        home.name AS home_team_name,
        away.name AS away_team_name
      FROM matches
      JOIN teams home ON home.id = matches.home_team_id
      JOIN teams away ON away.id = matches.away_team_id
      ORDER BY matches.kickoff_at ASC
    `
    )
    .all();
}

export function getMatchesWithPredictions(userId: number) {
  return db
    .prepare(
      `
      SELECT
        matches.id,
        matches.group_name,
        matches.kickoff_at,
        matches.venue,
        matches.actual_home_score,
        matches.actual_away_score,
        home.name AS home_team_name,
        away.name AS away_team_name,
        predictions.predicted_home_score,
        predictions.predicted_away_score,
        predictions.points_awarded
      FROM matches
      JOIN teams home ON home.id = matches.home_team_id
      JOIN teams away ON away.id = matches.away_team_id
      LEFT JOIN predictions
        ON predictions.match_id = matches.id
        AND predictions.user_id = ?
      ORDER BY matches.kickoff_at ASC
    `
    )
    .all(userId);
}

export function getMatchById(matchId: number) {
  return db
    .prepare(
      `
      SELECT
        matches.id,
        matches.group_name,
        matches.kickoff_at,
        matches.venue,
        matches.actual_home_score,
        matches.actual_away_score,
        matches.status,
        home.name AS home_team_name,
        away.name AS away_team_name
      FROM matches
      JOIN teams home ON home.id = matches.home_team_id
      JOIN teams away ON away.id = matches.away_team_id
      WHERE matches.id = ?
      LIMIT 1
    `
    )
    .get(matchId) as
    | {
        id: number;
        group_name: string;
        kickoff_at: string;
        venue: string | null;
        actual_home_score: number | null;
        actual_away_score: number | null;
        status: string;
        home_team_name: string;
        away_team_name: string;
      }
    | undefined;
}

export function getPredictionsForMatch(matchId: number) {
  return db
    .prepare(
      `
      SELECT
        users.id AS user_id,
        users.name,
        predictions.predicted_home_score,
        predictions.predicted_away_score,
        predictions.points_awarded
      FROM users
      LEFT JOIN predictions
        ON predictions.user_id = users.id
        AND predictions.match_id = ?
      ORDER BY users.name ASC
    `
    )
    .all(matchId) as Array<{
    user_id: number;
    name: string;
    predicted_home_score: number | null;
    predicted_away_score: number | null;
    points_awarded: number | null;
  }>;
}
