const swedishTeamNames: Record<string, string> = {
  Algeria: "Algeriet",
  Argentina: "Argentina",
  Australia: "Australien",
  Austria: "Österrike",
  Belgium: "Belgien",
  "Bosnia-Herzegovina": "Bosnien-Hercegovina",
  Brazil: "Brasilien",
  "Cabo Verde": "Kap Verde",
  Canada: "Kanada",
  Colombia: "Colombia",
  "Congo DR": "DR Kongo",
  Croatia: "Kroatien",
  "Curaçao": "Curaçao",
  Czechia: "Tjeckien",
  "Côte d'Ivoire": "Elfenbenskusten",
  Ecuador: "Ecuador",
  Egypt: "Egypten",
  England: "England",
  France: "Frankrike",
  Germany: "Tyskland",
  Ghana: "Ghana",
  Haiti: "Haiti",
  "IR Iran": "Iran",
  Iraq: "Irak",
  Japan: "Japan",
  Jordan: "Jordanien",
  "Korea Republic": "Sydkorea",
  Mexico: "Mexiko",
  Morocco: "Marocko",
  Netherlands: "Nederländerna",
  "New Zealand": "Nya Zeeland",
  Norway: "Norge",
  Panama: "Panama",
  Paraguay: "Paraguay",
  Portugal: "Portugal",
  Qatar: "Qatar",
  "Saudi Arabia": "Saudiarabien",
  Scotland: "Skottland",
  Senegal: "Senegal",
  "South Africa": "Sydafrika",
  Spain: "Spanien",
  Sweden: "Sverige",
  Switzerland: "Schweiz",
  Tunisia: "Tunisien",
  Türkiye: "Turkiet",
  USA: "USA",
  Uruguay: "Uruguay",
  Uzbekistan: "Uzbekistan",
};

const canonicalAliases: Record<string, string> = Object.fromEntries(
  Object.entries(swedishTeamNames).flatMap(([englishName, swedishName]) => [
    [englishName, englishName],
    [swedishName, englishName],
  ])
);

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

const normalizedAliasMap = new Map(
  Object.entries(canonicalAliases).map(([alias, canonical]) => [
    normalizeText(alias),
    canonical,
  ])
);

export function displayTeamName(name: string) {
  return swedishTeamNames[name] || name;
}

export function toCanonicalTeamName(name: string) {
  const normalized = normalizeText(name);
  return normalizedAliasMap.get(normalized) || name;
}

export function normalizeTeamNameForMatching(name: string) {
  return normalizeText(displayTeamName(toCanonicalTeamName(name)));
}
