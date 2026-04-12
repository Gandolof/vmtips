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
  predictedAwayScore: number,
  predictionSet = 1
) {
  if (predictionsAreLocked()) {
    throw new Error("Tipsen är låsta.");
  }

  const match = db
    .prepare(
      `
      SELECT actual_home_score, actual_away_score
      FROM matches
      WHERE id = ?
      LIMIT 1
    `
    )
    .get(matchId) as
    | {
        actual_home_score: number | null;
        actual_away_score: number | null;
      }
    | undefined;

  const pointsAwarded =
    match &&
    match.actual_home_score !== null &&
    match.actual_away_score !== null
      ? calculatePoints(
          predictedHomeScore,
          predictedAwayScore,
          match.actual_home_score,
          match.actual_away_score
        )
      : null;

  db.prepare(
    `
    INSERT INTO predictions (
      user_id,
      prediction_set,
      match_id,
      predicted_home_score,
      predicted_away_score,
      points_awarded
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, prediction_set, match_id)
    DO UPDATE SET
      predicted_home_score = excluded.predicted_home_score,
      predicted_away_score = excluded.predicted_away_score,
      points_awarded = excluded.points_awarded
  `
  ).run(
    userId,
    predictionSet,
    matchId,
    predictedHomeScore,
    predictedAwayScore,
    pointsAwarded
  );
}

export function savePredictionsBulk(
  userId: number,
  predictions: Array<{
    matchId: number;
    predictedHomeScore: number;
    predictedAwayScore: number;
  }>,
  predictionSet = 1
) {
  if (predictionsAreLocked()) {
    throw new Error("Tipsen är låsta.");
  }

  const matchIds = predictions.map((prediction) => prediction.matchId);
  const matchResultRows =
    matchIds.length > 0
      ? (db
          .prepare(
            `
            SELECT id, actual_home_score, actual_away_score
            FROM matches
            WHERE id IN (${matchIds.map(() => "?").join(",")})
          `
          )
          .all(...matchIds) as Array<{
          id: number;
          actual_home_score: number | null;
          actual_away_score: number | null;
        }>)
      : [];

  const matchResultsById = new Map(
    matchResultRows.map((row) => [row.id, row] as const)
  );

  const stmt = db.prepare(
    `
    INSERT INTO predictions (
      user_id,
      prediction_set,
      match_id,
      predicted_home_score,
      predicted_away_score,
      points_awarded
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, prediction_set, match_id)
    DO UPDATE SET
      predicted_home_score = excluded.predicted_home_score,
      predicted_away_score = excluded.predicted_away_score,
      points_awarded = excluded.points_awarded
  `
  );

  const tx = db.transaction(() => {
    for (const p of predictions) {
      const match = matchResultsById.get(p.matchId);
      const pointsAwarded =
        match &&
        match.actual_home_score !== null &&
        match.actual_away_score !== null
          ? calculatePoints(
              p.predictedHomeScore,
              p.predictedAwayScore,
              match.actual_home_score,
              match.actual_away_score
            )
          : null;

      stmt.run(
        userId,
        predictionSet,
        p.matchId,
        p.predictedHomeScore,
        p.predictedAwayScore,
        pointsAwarded
      );
    }
  });

  tx();
}

export function getLeaderboard() {
  return db
    .prepare(
      `
      WITH prediction_sets AS (
        SELECT users.id AS user_id, 1 AS prediction_set
        FROM users
        UNION
        SELECT DISTINCT predictions.user_id, predictions.prediction_set
        FROM predictions
      )
      SELECT
        users.id AS user_id,
        prediction_sets.prediction_set,
        CASE
          WHEN prediction_sets.prediction_set = 1 THEN users.name
          ELSE users.name || ' (' || prediction_sets.prediction_set || ')'
        END AS name,
        COALESCE(SUM(predictions.points_awarded), 0) AS total_points
      FROM prediction_sets
      JOIN users ON users.id = prediction_sets.user_id
      LEFT JOIN predictions
        ON predictions.user_id = prediction_sets.user_id
        AND predictions.prediction_set = prediction_sets.prediction_set
      GROUP BY users.id, users.name, prediction_sets.prediction_set
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

export function getMatchesWithPredictions(userId: number, predictionSet = 1) {
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
        AND predictions.prediction_set = ?
      ORDER BY matches.kickoff_at ASC
    `
    )
    .all(userId, predictionSet);
}

export function userHasPredictionSet(userId: number, predictionSet: number) {
  const row = db
    .prepare(
      `
      SELECT 1
      FROM predictions
      WHERE user_id = ?
        AND prediction_set = ?
      LIMIT 1
    `
    )
    .get(userId, predictionSet);

  return Boolean(row);
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
        predictions.prediction_set,
        CASE
          WHEN predictions.prediction_set IS NULL OR predictions.prediction_set = 1 THEN users.name
          ELSE users.name || ' (' || predictions.prediction_set || ')'
        END AS name,
        predictions.predicted_home_score,
        predictions.predicted_away_score,
        predictions.points_awarded
      FROM users
      LEFT JOIN predictions
        ON predictions.user_id = users.id
        AND predictions.match_id = ?
      ORDER BY
        CASE WHEN predictions.prediction_set IS NULL THEN 1 ELSE 0 END ASC,
        users.name ASC,
        predictions.prediction_set ASC
    `
    )
    .all(matchId) as Array<{
    user_id: number;
    prediction_set: number | null;
    name: string;
    predicted_home_score: number | null;
    predicted_away_score: number | null;
    points_awarded: number | null;
  }>;
}

type TournamentInfoMatch = {
  id: number;
  group_name: string;
  kickoff_at: string;
  venue: string | null;
  status: string;
  actual_home_score: number | null;
  actual_away_score: number | null;
  home_team_id: number;
  away_team_id: number;
  home_team_name: string;
  away_team_name: string;
};

type TournamentInfoTeam = {
  id: number;
  name: string;
  group_name: string | null;
};

export type GroupStanding = {
  teamId: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type TournamentGroup = {
  groupName: string;
  standings: GroupStanding[];
};

export function getTournamentInfoData() {
  const matches = db
    .prepare(
      `
      SELECT
        matches.id,
        matches.group_name,
        matches.kickoff_at,
        matches.venue,
        matches.status,
        matches.actual_home_score,
        matches.actual_away_score,
        matches.home_team_id,
        matches.away_team_id,
        home.name AS home_team_name,
        away.name AS away_team_name
      FROM matches
      JOIN teams home ON home.id = matches.home_team_id
      JOIN teams away ON away.id = matches.away_team_id
      ORDER BY matches.kickoff_at ASC
    `
    )
    .all() as TournamentInfoMatch[];

  const teams = db
    .prepare(
      `
      SELECT id, name, group_name
      FROM teams
      ORDER BY group_name ASC, name ASC
    `
    )
    .all() as TournamentInfoTeam[];

  const groupsMap = new Map<string, Map<number, GroupStanding>>();

  for (const team of teams) {
    const groupName = team.group_name || "-";
    const group = groupsMap.get(groupName) || new Map<number, GroupStanding>();

    group.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });

    groupsMap.set(groupName, group);
  }

  for (const match of matches) {
    if (match.actual_home_score === null || match.actual_away_score === null) {
      continue;
    }

    const group = groupsMap.get(match.group_name);
    if (!group) {
      continue;
    }

    const home = group.get(match.home_team_id);
    const away = group.get(match.away_team_id);

    if (!home || !away) {
      continue;
    }

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.actual_home_score;
    home.goalsAgainst += match.actual_away_score;
    away.goalsFor += match.actual_away_score;
    away.goalsAgainst += match.actual_home_score;

    if (match.actual_home_score > match.actual_away_score) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else if (match.actual_home_score < match.actual_away_score) {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  const groups = Array.from(groupsMap.entries())
    .sort(([groupA], [groupB]) => groupA.localeCompare(groupB, "sv"))
    .map(([groupName, standingsMap]) => ({
      groupName,
      standings: Array.from(standingsMap.values()).sort((teamA, teamB) => {
        if (teamB.points !== teamA.points) return teamB.points - teamA.points;
        if (teamB.goalDifference !== teamA.goalDifference) {
          return teamB.goalDifference - teamA.goalDifference;
        }
        if (teamB.goalsFor !== teamA.goalsFor) {
          return teamB.goalsFor - teamA.goalsFor;
        }
        return teamA.teamName.localeCompare(teamB.teamName, "sv");
      }),
    }));

  return {
    matches,
    groups,
  };
}
