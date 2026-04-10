import Link from "next/link";
import { notFound } from "next/navigation";
import TournamentStandings from "../../../components/TournamentStandings";
import { formatDateTimeSv } from "../../../lib/date-format";
import { getFifaMatchUrl } from "../../../lib/fifa-match-links";
import { getMatchById, getTournamentInfoData } from "../../../lib/queries";
import { getBroadcastInfoForMatch } from "../../../lib/tv-broadcast";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MatchInfoPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const parsedMatchId = Number(matchId);

  if (Number.isNaN(parsedMatchId)) {
    notFound();
  }

  const match = getMatchById(parsedMatchId);
  if (!match) {
    notFound();
  }

  const { groups, matches } = getTournamentInfoData();
  const fifaUrl = getFifaMatchUrl(match);
  const broadcastInfo = await getBroadcastInfoForMatch(match);
  const groupMatches = matches.filter((item) => item.group_name === match.group_name);
  const currentGroup = groups.filter((group) => group.groupName === match.group_name);

  return (
    <div>
      <h1 className="page-title">
        {match.home_team_name} - {match.away_team_name}
      </h1>
      <p className="page-subtitle">
        {match.group_name} · {formatDateTimeSv(match.kickoff_at)}
      </p>

      <div className="card tournament-highlight-card" style={{ marginBottom: 20 }}>
        <div className="hero-links" style={{ marginTop: 0 }}>
          <a href={fifaUrl} target="_blank" rel="noreferrer">
            FIFA:s matchsida
          </a>
        </div>

        {match.venue && (
          <div className="small-text" style={{ marginTop: 12 }}>
            Arena: {match.venue}
          </div>
        )}

        <div className="small-text" style={{ marginTop: 8 }}>
          Resultat:{" "}
          {match.actual_home_score !== null && match.actual_away_score !== null
            ? `${match.actual_home_score}-${match.actual_away_score}`
            : "Inte spelad"}
        </div>

        {broadcastInfo && (
          <div style={{ marginTop: 14 }}>
            <div className="small-text" style={{ marginBottom: 8 }}>
              TV-kanal
            </div>

            <div className="broadcast-list">
              {broadcastInfo.channels.map((channel) => {
                const label = channel.shortname || channel.name;
                const badgeClass = label.includes("SVT")
                  ? "broadcast-badge broadcast-badge-svt"
                  : label.includes("TV4")
                    ? "broadcast-badge broadcast-badge-tv4"
                    : "broadcast-badge";

                return channel.url ? (
                  <a
                    className={badgeClass}
                    href={channel.url}
                    key={channel.id}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {label}
                  </a>
                ) : (
                  <span className={badgeClass} key={channel.id}>
                    {label}
                  </span>
                );
              })}
            </div>

            <div className="small-text" style={{ marginTop: 8 }}>
              Källa: <a href={broadcastInfo.sourceUrl} target="_blank" rel="noreferrer">TVMatchen</a>
            </div>
          </div>
        )}
      </div>

      <div className="card tournament-highlight-card">
        <h3 className="group-title">Övriga matcher i grupp {match.group_name}</h3>

        <div className="prediction-list">
          {groupMatches.map((groupMatch) => (
            <div className="prediction-item" key={groupMatch.id}>
              <div className="prediction-meta">
                {formatDateTimeSv(groupMatch.kickoff_at)}
              </div>

              <div className="prediction-main prediction-main-readonly">
                <Link
                  className="prediction-match-link"
                  href={`/matches/${groupMatch.id}`}
                >
                  {groupMatch.home_team_name} - {groupMatch.away_team_name}
                </Link>
                <div className="prediction-value">
                  {groupMatch.actual_home_score !== null &&
                  groupMatch.actual_away_score !== null
                    ? `${groupMatch.actual_home_score}-${groupMatch.actual_away_score}`
                    : "Inte spelad"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 className="tournament-panel-title">Grupp {match.group_name}</h2>
        <TournamentStandings groups={currentGroup} />
      </div>
    </div>
  );
}
