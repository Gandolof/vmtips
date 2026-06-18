import Link from "next/link";
import { cookies } from "next/headers";
import StatisticsChart from "../../../components/StatisticsChart";
import { getSession } from "../../../lib/auth";
import { formatDateTimeSv } from "../../../lib/date-format";
import { getStatisticsData } from "../../../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StatisticsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  const session = getSession(sessionToken);
  const { timelineMatches, entries, cards } = getStatisticsData();

  return (
    <div>
      <h1 className="page-title">Statistik</h1>
      <p className="page-subtitle">
        Se hur varje tipsrad har utvecklats match för match, plus några roliga specialpriser.
      </p>

      <div className="hero-links" style={{ marginTop: 0, marginBottom: 20 }}>
        <Link className="button-secondary button" href="/leaderboard">
          Tillbaka till topplistan
        </Link>
      </div>

      <div className="stats-card-grid" style={{ marginBottom: 20 }}>
        {cards.map((card) => (
          <div className="card tournament-highlight-card" key={card.title}>
            <h3 className="group-title">{card.title}</h3>
            {card.title !== "Skrällkännaren" && (
              <div className="stats-card-value">{card.value}</div>
            )}
            {card.leaderDetails &&
            card.leaderDetails.length > 0 &&
            (card.title === "Flest 10:or" || card.title === "Flest rätt tecken") ? (
              <div className="stats-card-ranking">
                {card.leaderDetails.map((leader) => (
                  <div className="stats-card-ranking-row" key={`${card.title}-${leader.name}`}>
                    <span className="stats-card-ranking-value">{leader.detail}</span>
                    <span className="stats-card-ranking-name">{leader.name}</span>
                  </div>
                ))}
              </div>
            ) : card.leaderDetails && card.leaderDetails.length > 0 ? (
              <div className="stats-card-details">
                {card.leaderDetails.map((leader) => (
                  <div className="stats-card-detail-row" key={`${card.title}-${leader.name}`}>
                    <div className="stats-card-leaders">{leader.name}</div>
                    <div className="small-text">{leader.detail}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="stats-card-leaders">{card.leaders.join(", ")}</div>
            )}
            <div className="small-text" style={{ marginTop: 10 }}>
              {card.description}
            </div>
          </div>
        ))}
      </div>

      <div className="card tournament-highlight-card" style={{ marginBottom: 20 }}>
        <h3 className="group-title">Poängutveckling</h3>
        <StatisticsChart
          timelineMatches={timelineMatches}
          entries={entries}
          currentUserId={session?.user_id ?? null}
        />
      </div>

      {timelineMatches.length > 0 && (
        <div className="card tournament-highlight-card" style={{ marginBottom: 20 }}>
          <h3 className="group-title">Matchnyckel</h3>
          <div className="prediction-list match-list-compact">
            {timelineMatches.map((match, index) => (
              <div className="prediction-item match-list-item" key={match.matchId}>
                <div className="prediction-meta">
                  Match {index + 1} · {formatDateTimeSv(match.kickoffAt)}
                </div>
                <div className="prediction-main prediction-main-readonly">
                  <Link className="prediction-match-link" href={`/matches/${match.matchId}`}>
                    {match.homeTeamName} - {match.awayTeamName}
                  </Link>
                  <div className="prediction-value">
                    {match.actualHomeScore}-{match.actualAwayScore}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
