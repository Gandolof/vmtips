import { createRequire } from "module";
import { toCanonicalTeamName } from "./team-names";

const require = createRequire(import.meta.url);
const fifaMatchesData = require("../fifa_wc2026_matches.json");

type FifaMatch = {
  IdCompetition: string;
  IdSeason: string;
  IdStage: string;
  IdMatch: string;
  Date: string;
  Home?: {
    TeamName?: Array<{ Description: string }>;
  } | null;
  Away?: {
    TeamName?: Array<{ Description: string }>;
  } | null;
  Stadium?: {
    Name?: Array<{ Description: string }>;
  } | null;
};

const FIFA_FIXTURES_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures?country=&wtw-filter=ALL";

function getText(items?: Array<{ Description: string }> | null) {
  return items && items.length > 0 ? items[0].Description : "";
}

function normalizeName(name: string) {
  return toCanonicalTeamName(name).trim().toLowerCase();
}

function buildKey(kickoffAt: string, homeTeam: string, awayTeam: string, venue: string) {
  return [
    kickoffAt.trim(),
    normalizeName(homeTeam),
    normalizeName(awayTeam),
    venue.trim().toLowerCase(),
  ].join("|");
}

function loadMatchLinkMap() {
  const data = fifaMatchesData as { Results?: FifaMatch[] };
  const map = new Map<string, string>();

  for (const match of data.Results || []) {
    const homeTeam = getText(match.Home?.TeamName);
    const awayTeam = getText(match.Away?.TeamName);
    const venue = getText(match.Stadium?.Name);

    if (!match.Date || !homeTeam || !awayTeam || !venue) continue;

    map.set(
      buildKey(match.Date, homeTeam, awayTeam, venue),
      `https://www.fifa.com/en/match-centre/match/${match.IdCompetition}/${match.IdSeason}/${match.IdStage}/${match.IdMatch}`
    );
  }

  return map;
}

const matchLinkMap = loadMatchLinkMap();

export function getFifaMatchUrl(match: {
  kickoff_at: string;
  home_team_name: string;
  away_team_name: string;
  venue: string | null;
}) {
  if (!match.venue) return FIFA_FIXTURES_URL;

  return (
    matchLinkMap.get(
      buildKey(
        match.kickoff_at,
        match.home_team_name,
        match.away_team_name,
        match.venue
      )
    ) || FIFA_FIXTURES_URL
  );
}
