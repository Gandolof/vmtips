import Link from "next/link";
import { formatDateTimeSv } from "../lib/date-format";
import { getLeaderboard, getTournamentInfoData } from "../lib/queries";
import TournamentStandings from "./TournamentStandings";

export default function MatchesOverview({
  title = "Matcher och tabeller",
  showHeading = true,
}: {
  title?: string;
  showHeading?: boolean;
}) {
  const { matches, groups } = getTournamentInfoData();
  const leaders = (getLeaderboard() as Array<{
    user_id: number;
    prediction_set: number;
    name: string;
    total_points: number;
  }>).slice(0, 5);

  return (
    <div>
      {showHeading && <h2 className="tournament-panel-title">{title}</h2>}

      <div className="matches-page-layout">
        <div className="card tournament-highlight-card">
          <div className="prediction-toolbar match-list-toolbar">
            <div className="small-text">{matches.length} matcher i gruppspelet</div>
            <Link className="button" href="/test">
              Gå till tippa
            </Link>
          </div>

          <div className="prediction-list match-list-compact">
            {matches.map((match) => (
              <div className="prediction-item match-list-item" key={match.id}>
                <div className="prediction-meta">
                  Grupp {match.group_name} · {formatDateTimeSv(match.kickoff_at)}
                </div>

                <div className="prediction-main prediction-main-readonly">
                  <Link className="prediction-match-link" href={`/matches/${match.id}`}>
                    {match.home_team_name} - {match.away_team_name}
                  </Link>
                  <div className="prediction-value">
                    {match.actual_home_score !== null && match.actual_away_score !== null
                      ? `${match.actual_home_score}-${match.actual_away_score}`
                      : "Inte spelad"}
                  </div>
                </div>

                {match.venue && (
                  <div className="small-text match-list-venue">
                    Arena: {match.venue}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card tournament-highlight-card" style={{ marginBottom: 16 }}>
            <h3 className="group-title">Topp 5</h3>

            <div className="prediction-list match-list-compact">
              {leaders.map((leader, index) => (
                <div
                  className="prediction-item match-list-item"
                  key={`${leader.user_id}-${leader.prediction_set}`}
                >
                  <div className="prediction-main prediction-main-readonly leader-row">
                    <Link
                      className="prediction-match-link leader-link"
                      href={`/leaderboard/${leader.user_id}?set=${leader.prediction_set}`}
                    >
                      <span className="leader-rank">{index + 1}</span>
                      {leader.name}
                    </Link>
                    <div className="prediction-value">{leader.total_points} p</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h3 className="group-title">Gruppställning</h3>
          <TournamentStandings groups={groups} />
        </div>
      </div>
    </div>
  );
}
