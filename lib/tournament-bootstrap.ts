import { createRequire } from "module";
import type Database from "better-sqlite3";

const require = createRequire(import.meta.url);
const fifaMatchesData = require("../fifa_wc2026_matches.json") as {
  Results?: FifaMatch[];
};

type FifaNamedValue = Array<{ Description: string }>;

type FifaMatch = {
  IdStage?: string;
  Date?: string;
  GroupName?: FifaNamedValue;
  Home?: {
    TeamName?: FifaNamedValue;
    Abbreviation?: string;
    IdCountry?: string;
  } | null;
  Away?: {
    TeamName?: FifaNamedValue;
    Abbreviation?: string;
    IdCountry?: string;
  } | null;
  Stadium?: {
    Name?: FifaNamedValue;
  } | null;
};

const GROUP_STAGE_ID = "289273";
const DEFAULT_PREDICTIONS_LOCK_AT = "2026-06-11T20:00:00Z";

function getDescription(values?: FifaNamedValue | null) {
  return values && values.length > 0 ? values[0].Description.trim() : "";
}

function normalizeTeamName(name: string) {
  if (name === "USA") return "United States";
  return name;
}

function getGroupLetter(groupName: string) {
  return groupName.replace(/^Group\s+/i, "").trim();
}

function getGroupStageMatches() {
  return (fifaMatchesData.Results || []).filter(
    (match) =>
      match.IdStage === GROUP_STAGE_ID &&
      match.Date &&
      match.Home &&
      match.Away &&
      getDescription(match.Home.TeamName) &&
      getDescription(match.Away.TeamName)
  );
}

export function ensureTournamentBootstrap(db: Database.Database) {
  const teamCount = (
    db.prepare("SELECT COUNT(*) as count FROM teams").get() as { count: number }
  ).count;
  const matchCount = (
    db.prepare("SELECT COUNT(*) as count FROM matches").get() as { count: number }
  ).count;

  if (teamCount > 0 && matchCount > 0) {
    return;
  }

  const groupStageMatches = getGroupStageMatches();
  const teamsByCode = new Map<
    string,
    {
      name: string;
      code: string;
      groupName: string;
    }
  >();

  for (const match of groupStageMatches) {
    const groupName = getGroupLetter(getDescription(match.GroupName));

    const homeCode = (match.Home?.Abbreviation || match.Home?.IdCountry || "").trim();
    const awayCode = (match.Away?.Abbreviation || match.Away?.IdCountry || "").trim();
    const homeName = normalizeTeamName(getDescription(match.Home?.TeamName));
    const awayName = normalizeTeamName(getDescription(match.Away?.TeamName));

    if (homeCode && homeName) {
      teamsByCode.set(homeCode, {
        name: homeName,
        code: homeCode,
        groupName,
      });
    }

    if (awayCode && awayName) {
      teamsByCode.set(awayCode, {
        name: awayName,
        code: awayCode,
        groupName,
      });
    }
  }

  const insertTeam = db.prepare(`
    INSERT INTO teams (name, code, group_name)
    VALUES (?, ?, ?)
  `);
  const insertMatch = db.prepare(`
    INSERT INTO matches (
      group_name,
      home_team_id,
      away_team_id,
      kickoff_at,
      venue,
      status
    )
    VALUES (?, ?, ?, ?, ?, 'SCHEDULED')
  `);
  const insertSettings = db.prepare(`
    INSERT INTO settings (predictions_lock_at)
    VALUES (?)
  `);

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM predictions").run();
    db.prepare("DELETE FROM matches").run();
    db.prepare("DELETE FROM teams").run();

    for (const team of teamsByCode.values()) {
      insertTeam.run(team.name, team.code, team.groupName);
    }

    const teams = db
      .prepare("SELECT id, code FROM teams")
      .all() as Array<{ id: number; code: string }>;
    const teamIdsByCode = new Map(teams.map((team) => [team.code, team.id]));

    for (const match of groupStageMatches) {
      const groupName = getGroupLetter(getDescription(match.GroupName));
      const homeCode = (match.Home?.Abbreviation || match.Home?.IdCountry || "").trim();
      const awayCode = (match.Away?.Abbreviation || match.Away?.IdCountry || "").trim();
      const kickoffAt = String(match.Date);
      const venue = getDescription(match.Stadium?.Name) || null;

      const homeTeamId = teamIdsByCode.get(homeCode);
      const awayTeamId = teamIdsByCode.get(awayCode);

      if (!homeTeamId || !awayTeamId) continue;

      insertMatch.run(groupName, homeTeamId, awayTeamId, kickoffAt, venue);
    }

    const settingsCount = (
      db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number }
    ).count;

    if (settingsCount === 0) {
      insertSettings.run(DEFAULT_PREDICTIONS_LOCK_AT);
    }
  });

  tx();
}
