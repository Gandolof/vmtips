import { db } from "./db";
import { calculatePoints } from "./scoring";
import { displayTeamName } from "./team-names";

function getCalculatedPoints(
  predictedHomeScore: number | null,
  predictedAwayScore: number | null,
  actualHomeScore: number | null,
  actualAwayScore: number | null,
  storedPoints: number | null
) {
  if (
    predictedHomeScore === null ||
    predictedAwayScore === null ||
    actualHomeScore === null ||
    actualAwayScore === null
  ) {
    return storedPoints;
  }

  return calculatePoints(
    predictedHomeScore,
    predictedAwayScore,
    actualHomeScore,
    actualAwayScore
  );
}

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
  const users = db
    .prepare(
      `
      SELECT id, name
      FROM users
      ORDER BY name ASC
    `
    )
    .all() as Array<{ id: number; name: string }>;

  const predictions = db
    .prepare(
      `
      SELECT
        predictions.user_id,
        predictions.prediction_set,
        predictions.predicted_home_score,
        predictions.predicted_away_score,
        predictions.points_awarded,
        matches.actual_home_score,
        matches.actual_away_score
      FROM predictions
      JOIN matches ON matches.id = predictions.match_id
    `
    )
    .all() as Array<{
    user_id: number;
    prediction_set: number;
    predicted_home_score: number | null;
    predicted_away_score: number | null;
    points_awarded: number | null;
    actual_home_score: number | null;
    actual_away_score: number | null;
  }>;

  const totals = new Map<string, { user_id: number; prediction_set: number; total_points: number }>();

  for (const user of users) {
    const key = `${user.id}-1`;
    totals.set(key, { user_id: user.id, prediction_set: 1, total_points: 0 });
  }

  for (const prediction of predictions) {
    const key = `${prediction.user_id}-${prediction.prediction_set}`;
    const current =
      totals.get(key) || {
        user_id: prediction.user_id,
        prediction_set: prediction.prediction_set,
        total_points: 0,
      };

    current.total_points +=
      getCalculatedPoints(
        prediction.predicted_home_score,
        prediction.predicted_away_score,
        prediction.actual_home_score,
        prediction.actual_away_score,
        prediction.points_awarded
      ) || 0;

    totals.set(key, current);
  }

  return Array.from(totals.values())
    .map((row) => {
      const user = users.find((item) => item.id === row.user_id)!;

      return {
        user_id: row.user_id,
        prediction_set: row.prediction_set,
        name:
          row.prediction_set === 1
            ? user.name
            : `${user.name} (${row.prediction_set})`,
        total_points: row.total_points,
      };
    })
    .sort(
      (a, b) => b.total_points - a.total_points || a.name.localeCompare(b.name, "sv")
    );
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

export function clearMatchResult(matchId: number) {
  db.prepare(
    `
    UPDATE matches
    SET actual_home_score = NULL, actual_away_score = NULL, status = 'SCHEDULED'
    WHERE id = ?
  `
  ).run(matchId);

  db.prepare(
    `
    UPDATE predictions
    SET points_awarded = NULL
    WHERE match_id = ?
  `
  ).run(matchId);
}

export function getAllMatches() {
  return (db
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
    .all() as Array<any>).map((match) => ({
    ...match,
    home_team_name: displayTeamName(match.home_team_name),
    away_team_name: displayTeamName(match.away_team_name),
  }));
}

export function getMatchesWithPredictions(userId: number, predictionSet = 1) {
  return (db
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
    .all(userId, predictionSet) as Array<any>).map((match) => ({
    ...match,
    home_team_name: displayTeamName(match.home_team_name),
    away_team_name: displayTeamName(match.away_team_name),
    points_awarded: getCalculatedPoints(
      match.predicted_home_score,
      match.predicted_away_score,
      match.actual_home_score,
      match.actual_away_score,
      match.points_awarded
    ),
  }));
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
  const match = db
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

  if (!match) return undefined;

  return {
    ...match,
    home_team_name: displayTeamName(match.home_team_name),
    away_team_name: displayTeamName(match.away_team_name),
  };
}

export function getPredictionsForMatch(matchId: number) {
  return (db
    .prepare(
      `
      SELECT
        users.id AS user_id,
        predictions.prediction_set,
        CASE
          WHEN predictions.prediction_set = 1 THEN users.name
          ELSE users.name || ' (' || predictions.prediction_set || ')'
        END AS name,
        predictions.predicted_home_score,
        predictions.predicted_away_score,
        predictions.points_awarded,
        matches.actual_home_score,
        matches.actual_away_score
      FROM predictions
      JOIN matches ON matches.id = predictions.match_id
      JOIN users ON users.id = predictions.user_id
      WHERE predictions.match_id = ?
      ORDER BY
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
    actual_home_score: number | null;
    actual_away_score: number | null;
  }>).map((prediction) => ({
    ...prediction,
    points_awarded: getCalculatedPoints(
      prediction.predicted_home_score,
      prediction.predicted_away_score,
      prediction.actual_home_score,
      prediction.actual_away_score,
      prediction.points_awarded
    ),
  }));
}

function getOutcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return "HOME";
  if (homeScore < awayScore) return "AWAY";
  return "DRAW";
}

export type StatisticsTimelineMatch = {
  matchId: number;
  kickoffAt: string;
  homeTeamName: string;
  awayTeamName: string;
  actualHomeScore: number;
  actualAwayScore: number;
};

export type StatisticsEntry = {
  user_id: number;
  prediction_set: number;
  name: string;
  total_points: number;
  ten_count: number;
  correct_outcome_count: number;
  zero_count: number;
  biggest_climb: number;
  longest_streak: number;
  upset_points: number;
  timeline: Array<{
    matchId: number;
    totalPoints: number;
    pointsGained: number;
    rank: number;
  }>;
};

export type StatisticsCard = {
  title: string;
  value: number;
  leaders: string[];
  leaderDetails?: Array<{
    name: string;
    detail: string;
  }>;
  description: string;
};

export function getStatisticsData() {
  const rows = db
    .prepare(
      `
      SELECT
        predictions.user_id,
        predictions.prediction_set,
        users.name AS user_name,
        matches.id AS match_id,
        matches.kickoff_at,
        home.name AS home_team_name,
        away.name AS away_team_name,
        matches.actual_home_score,
        matches.actual_away_score,
        predictions.predicted_home_score,
        predictions.predicted_away_score,
        predictions.points_awarded
      FROM predictions
      JOIN users ON users.id = predictions.user_id
      JOIN matches ON matches.id = predictions.match_id
      JOIN teams home ON home.id = matches.home_team_id
      JOIN teams away ON away.id = matches.away_team_id
      WHERE matches.actual_home_score IS NOT NULL
        AND matches.actual_away_score IS NOT NULL
      ORDER BY
        matches.kickoff_at ASC,
        matches.id ASC,
        users.name ASC,
        predictions.prediction_set ASC
    `
    )
    .all() as Array<{
    user_id: number;
    prediction_set: number;
    user_name: string;
    match_id: number;
    kickoff_at: string;
    home_team_name: string;
    away_team_name: string;
    actual_home_score: number;
    actual_away_score: number;
    predicted_home_score: number;
    predicted_away_score: number;
    points_awarded: number | null;
  }>;

  const timelineMatches: StatisticsTimelineMatch[] = [];
  const seenMatchIds = new Set<number>();

  for (const row of rows) {
    if (seenMatchIds.has(row.match_id)) {
      continue;
    }

    seenMatchIds.add(row.match_id);
    timelineMatches.push({
      matchId: row.match_id,
      kickoffAt: row.kickoff_at,
      homeTeamName: displayTeamName(row.home_team_name),
      awayTeamName: displayTeamName(row.away_team_name),
      actualHomeScore: row.actual_home_score,
      actualAwayScore: row.actual_away_score,
    });
  }

  const entries = new Map<string, StatisticsEntry>();
  const predictionsByMatch = new Map<
    number,
    Array<{
      entryKey: string;
      points: number;
      correctOutcome: boolean;
    }>
  >();
  const upsetMatchesByEntry = new Map<
    string,
    Array<{
      matchId: number;
      label: string;
      points: number;
    }>
  >();

  for (const row of rows) {
    const key = `${row.user_id}-${row.prediction_set}`;
    const points =
      getCalculatedPoints(
        row.predicted_home_score,
        row.predicted_away_score,
        row.actual_home_score,
        row.actual_away_score,
        row.points_awarded
      ) || 0;
    const actualOutcome = getOutcome(row.actual_home_score, row.actual_away_score);
    const predictedOutcome = getOutcome(
      row.predicted_home_score,
      row.predicted_away_score
    );
    const correctOutcome = actualOutcome === predictedOutcome;

    if (!entries.has(key)) {
      entries.set(key, {
        user_id: row.user_id,
        prediction_set: row.prediction_set,
        name:
          row.prediction_set === 1
            ? row.user_name
            : `${row.user_name} (${row.prediction_set})`,
        total_points: 0,
        ten_count: 0,
        correct_outcome_count: 0,
        zero_count: 0,
        biggest_climb: 0,
        longest_streak: 0,
        upset_points: 0,
        timeline: [],
      });
    }

    const entry = entries.get(key)!;
    entry.total_points += points;
    if (points === 10) entry.ten_count += 1;
    if (points === 0) entry.zero_count += 1;
    if (correctOutcome) entry.correct_outcome_count += 1;

    const currentMatchPredictions = predictionsByMatch.get(row.match_id) || [];
    currentMatchPredictions.push({
      entryKey: key,
      points,
      correctOutcome,
    });
    predictionsByMatch.set(row.match_id, currentMatchPredictions);
  }

  const runningTotals = new Map<string, number>();
  const runningStreaks = new Map<string, number>();
  const bestStreaks = new Map<string, number>();
  const previousRanks = new Map<string, number>();

  const orderedEntries = Array.from(entries.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "sv")
  );

  for (const entry of orderedEntries) {
    runningTotals.set(`${entry.user_id}-${entry.prediction_set}`, 0);
    runningStreaks.set(`${entry.user_id}-${entry.prediction_set}`, 0);
    bestStreaks.set(`${entry.user_id}-${entry.prediction_set}`, 0);
  }

  for (const timelineMatch of timelineMatches) {
    const predictions = predictionsByMatch.get(timelineMatch.matchId) || [];
    const predictionsByEntry = new Map(
      predictions.map((prediction) => [prediction.entryKey, prediction] as const)
    );

    const zeroCount = predictions.filter((prediction) => prediction.points === 0).length;
    const isUpsetMatch =
      predictions.length > 0 && zeroCount > predictions.length / 2;

    for (const entry of orderedEntries) {
      const key = `${entry.user_id}-${entry.prediction_set}`;
      const prediction = predictionsByEntry.get(key);
      const pointsGained = prediction?.points ?? 0;
      const newTotal = (runningTotals.get(key) || 0) + pointsGained;
      runningTotals.set(key, newTotal);

      const currentStreak = pointsGained > 0 ? (runningStreaks.get(key) || 0) + 1 : 0;
      runningStreaks.set(key, currentStreak);
      bestStreaks.set(key, Math.max(bestStreaks.get(key) || 0, currentStreak));

      if (isUpsetMatch) {
        entry.upset_points += pointsGained;
        if (pointsGained > 0) {
          const currentUpsets = upsetMatchesByEntry.get(key) || [];
          currentUpsets.push({
            matchId: timelineMatch.matchId,
            label: `${timelineMatch.homeTeamName} - ${timelineMatch.awayTeamName}`,
            points: pointsGained,
          });
          upsetMatchesByEntry.set(key, currentUpsets);
        }
      }

      entry.timeline.push({
        matchId: timelineMatch.matchId,
        totalPoints: newTotal,
        pointsGained,
        rank: 0,
      });
    }

    const rankedEntries = [...orderedEntries].sort((a, b) => {
      const totalA = runningTotals.get(`${a.user_id}-${a.prediction_set}`) || 0;
      const totalB = runningTotals.get(`${b.user_id}-${b.prediction_set}`) || 0;
      return totalB - totalA || a.name.localeCompare(b.name, "sv");
    });

    rankedEntries.forEach((entry, index) => {
      const key = `${entry.user_id}-${entry.prediction_set}`;
      const currentRank = index + 1;
      const previousRank = previousRanks.get(key);

      if (previousRank !== undefined) {
        entry.biggest_climb = Math.max(entry.biggest_climb, previousRank - currentRank);
      }

      previousRanks.set(key, currentRank);

      const point = entry.timeline[entry.timeline.length - 1];
      if (point) {
        point.rank = currentRank;
      }
    });
  }

  for (const entry of orderedEntries) {
    const key = `${entry.user_id}-${entry.prediction_set}`;
    entry.longest_streak = bestStreaks.get(key) || 0;
    entry.total_points =
      entry.timeline.length > 0 ? entry.timeline[entry.timeline.length - 1].totalPoints : 0;
  }

  const finalEntries = [...orderedEntries].sort(
    (a, b) => b.total_points - a.total_points || a.name.localeCompare(b.name, "sv")
  );

  function createCard(
    title: string,
    selector: (entry: StatisticsEntry) => number,
    description: string
  ): StatisticsCard {
    const maxValue = finalEntries.reduce(
      (max, entry) => Math.max(max, selector(entry)),
      0
    );
    const leaders = finalEntries
      .filter((entry) => selector(entry) === maxValue)
      .map((entry) => entry.name);

    return {
      title,
      value: maxValue,
      leaders,
      description,
    };
  }

  const cards: StatisticsCard[] = [
    createCard("Flest 10:or", (entry) => entry.ten_count, "Flest exakta resultat."),
    createCard(
      "Flest rätt tecken",
      (entry) => entry.correct_outcome_count,
      "Flest matcher med rätt vinnare eller kryss."
    ),
    createCard(
      "Längsta poängsvit",
      (entry) => entry.longest_streak,
      "Flest raka matcher med poäng."
    ),
    createCard(
      "Skrällkännaren",
      (entry) => entry.upset_points,
      "Flest poäng i matcher där majoriteten fick 0 poäng."
    ),
  ];

  const upsetCard = cards.find((card) => card.title === "Skrällkännaren");
  if (upsetCard) {
    upsetCard.leaderDetails = finalEntries
      .filter((entry) => entry.upset_points === upsetCard.value)
      .map((entry) => {
        const key = `${entry.user_id}-${entry.prediction_set}`;
        const matches = (upsetMatchesByEntry.get(key) || [])
          .map((match) => `${match.label} (${match.points} p)`)
          .join(", ");

        return {
          name: entry.name,
          detail: matches || "Ingen enskild skrällmatch registrerad",
        };
      });
  }

  const topTenCard = cards.find((card) => card.title === "Flest 10:or");
  if (topTenCard) {
    topTenCard.leaderDetails = finalEntries
      .filter((entry) => entry.ten_count > 0)
      .sort(
        (a, b) => b.ten_count - a.ten_count || a.name.localeCompare(b.name, "sv")
      )
      .slice(0, 5)
      .map((entry) => ({
        name: entry.name,
        detail: `${entry.ten_count} st`,
      }));
  }

  const correctOutcomeCard = cards.find((card) => card.title === "Flest rätt tecken");
  if (correctOutcomeCard) {
    correctOutcomeCard.leaderDetails = finalEntries
      .filter((entry) => entry.correct_outcome_count > 0)
      .sort(
        (a, b) =>
          b.correct_outcome_count - a.correct_outcome_count ||
          a.name.localeCompare(b.name, "sv")
      )
      .slice(0, 5)
      .map((entry) => ({
        name: entry.name,
        detail: `${entry.correct_outcome_count} st`,
      }));
  }

  return {
    timelineMatches,
    entries: finalEntries,
    cards,
  };
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
      teamName: displayTeamName(team.name),
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
    matches: matches.map((match) => ({
      ...match,
      home_team_name: displayTeamName(match.home_team_name),
      away_team_name: displayTeamName(match.away_team_name),
    })),
    groups,
  };
}
