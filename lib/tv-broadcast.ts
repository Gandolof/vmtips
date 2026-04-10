type TvMatchenChannel = {
  id: number;
  name: string;
  shortname?: string | null;
  url?: string | null;
  url_slug?: string | null;
  sprite_class?: string | null;
};

type TvMatchenFixture = {
  title: string;
  date: string;
  venue: string | null;
  league_slug: string;
  home_team: string;
  visiting_team: string;
  channels?: TvMatchenChannel[];
};

export type MatchBroadcastInfo = {
  channels: TvMatchenChannel[];
  sourceUrl: string;
};

const TVMATCHEN_URL = "https://www.tvmatchen.nu/fotboll/fotbolls-vm";

const teamNameMap: Record<string, string> = {
  "United States": "USA",
  "South Korea": "Sydkorea",
  Sweden: "Sverige",
  Norway: "Norge",
  Denmark: "Danmark",
  Germany: "Tyskland",
  Spain: "Spanien",
  France: "Frankrike",
  Belgium: "Belgien",
  Croatia: "Kroatien",
  Morocco: "Marocko",
  Paraguay: "Paraguay",
  Mexico: "Mexiko",
  Canada: "Kanada",
  Switzerland: "Schweiz",
  Brazil: "Brasilien",
  Scotland: "Skottland",
  Australia: "Australien",
  Turkey: "Turkiet",
  Netherlands: "Nederländerna",
  Japan: "Japan",
  Ecuador: "Ecuador",
  Tunisia: "Tunisien",
  "Saudi Arabia": "Saudiarabien",
  Uruguay: "Uruguay",
  Iran: "Iran",
  "New Zealand": "Nya Zeeland",
  Egypt: "Egypten",
  Argentina: "Argentina",
  Austria: "Österrike",
  Portugal: "Portugal",
  England: "England",
  Ghana: "Ghana",
  Panama: "Panama",
  Colombia: "Colombia",
  Qatar: "Qatar",
  Haiti: "Haiti",
  Curacao: "Curaçao",
  "Ivory Coast": "Elfenbenskusten",
  "Bosnia and Herzegovina": "Bosnien-Hercegovina",
  "Czech Republic": "Tjeckien",
  "Cape Verde": "Kap Verde",
  Iraq: "Irak",
  Algeria: "Algeriet",
  Jordan: "Jordanien",
  Uzbekistan: "Uzbekistan",
  Senegal: "Senegal",
  "DR Congo": "DR Kongo",
  "South Africa": "Sydafrika",
};

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeVenue(value: string | null | undefined) {
  return normalizeText(value);
}

function normalizeTeamName(value: string) {
  return normalizeText(teamNameMap[value] || value);
}

function getTvMatchenDisplayName(value: string) {
  return teamNameMap[value] || value;
}

function slugifyTvMatchenName(value: string) {
  return getTvMatchenDisplayName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "och")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function normalizeChannel(channel: TvMatchenChannel) {
  const label = channel.shortname || channel.name || "";

  if (label.includes("SVT")) {
    return {
      ...channel,
      name: "SVT Play",
      shortname: "SVT Play",
      url: "https://www.svtplay.se/",
    };
  }

  if (label.includes("TV4")) {
    return {
      ...channel,
      name: "TV4 Play",
      shortname: "TV4 Play",
      url: "https://www.tv4play.se/sport",
    };
  }

  return channel;
}

async function loadTvMatchenMatchPageForMatch(match: {
  home_team_name: string;
  away_team_name: string;
}) {
  const homeSlug = slugifyTvMatchenName(match.home_team_name);
  const awaySlug = slugifyTvMatchenName(match.away_team_name);

  const scheduleResponse = await fetch(TVMATCHEN_URL, {
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!scheduleResponse.ok) {
    return null;
  }

  const scheduleHtml = await scheduleResponse.text();
  const hrefMatch = scheduleHtml.match(
    new RegExp(`/match/${homeSlug}-${awaySlug}-\\d+`, "i")
  );

  if (!hrefMatch) {
    return null;
  }

  const matchUrl = `https://www.tvmatchen.nu${hrefMatch[0]}`;
  const response = await fetch(matchUrl, {
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const decodedHtml = html
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');

  const fixtureMatch = decodedHtml.match(
    /"fixture":(\{"fixture_id":[\s\S]*?"focus":null\})/
  );

  if (!fixtureMatch) {
    return null;
  }

  try {
    return JSON.parse(fixtureMatch[1]) as TvMatchenFixture;
  } catch {
    return null;
  }
}

async function loadTvMatchenFixtures() {
  const response = await fetch(TVMATCHEN_URL, {
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!response.ok) {
    throw new Error("Kunde inte läsa TVMatchen.");
  }

  const html = await response.text();
  const decodedHtml = html
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');

  const pattern = /\{"fixture_id":\d+[\s\S]*?"deep_links":\[\]\}/g;
  const fixtures: TvMatchenFixture[] = [];

  for (const match of decodedHtml.matchAll(pattern)) {
    try {
      const fixture = JSON.parse(match[0]) as TvMatchenFixture;

      if (fixture.league_slug === "fotbolls-vm") {
        fixtures.push(fixture);
      }
    } catch {
      // Skip malformed objects from unrelated chunks.
    }
  }

  return fixtures;
}

export async function getBroadcastInfoForMatch(match: {
  kickoff_at: string;
  venue: string | null;
  home_team_name: string;
  away_team_name: string;
}) {
  const fixtures = await loadTvMatchenFixtures();
  const targetDate = new Date(match.kickoff_at).toISOString();
  const targetVenue = normalizeVenue(match.venue);
  const targetHome = normalizeTeamName(match.home_team_name);
  const targetAway = normalizeTeamName(match.away_team_name);

  const fixture =
    fixtures.find(
      (item) =>
        item.date === targetDate &&
        normalizeVenue(item.venue) === targetVenue
    ) ||
    fixtures.find(
      (item) =>
        item.date === targetDate &&
        normalizeTeamName(item.home_team) === targetHome &&
        normalizeTeamName(item.visiting_team) === targetAway
    ) ||
    (await loadTvMatchenMatchPageForMatch(match));

  if (!fixture || !fixture.channels || fixture.channels.length === 0) {
    return null;
  }

  return {
    channels: fixture.channels.map(normalizeChannel),
    sourceUrl: TVMATCHEN_URL,
  } satisfies MatchBroadcastInfo;
}
