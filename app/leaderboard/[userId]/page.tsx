import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTimeSv } from "../../../lib/date-format";
import { getFifaMatchUrl } from "../../../lib/fifa-match-links";
import { getMatchesWithPredictions, getUserById } from "../../../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeaderboardUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const parsedUserId = Number(userId);

  if (Number.isNaN(parsedUserId)) {
    notFound();
  }

  const user = getUserById(parsedUserId);
  if (!user) {
    notFound();
  }

  const matches = getMatchesWithPredictions(parsedUserId).map((match: any) => ({
    ...match,
    fifa_url: getFifaMatchUrl(match),
  }));

  return (
    <div>
      <h1 className="page-title">{user.name}</h1>
      <p className="page-subtitle">Skrivskyddade tips och resultat.</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <Link href="/leaderboard">Tillbaka till topplistan</Link>
      </div>

      <div className="card">
        <div className="prediction-toolbar">
          <div className="small-text">{matches.length} matcher</div>
        </div>

        <div className="prediction-list">
          {matches.map((m: any) => (
            <div className="prediction-item" key={m.id}>
              <div className="prediction-meta">
                {m.group_name} · {formatDateTimeSv(m.kickoff_at)}
              </div>

              <div className="prediction-main prediction-main-readonly">
                <Link
                  className="prediction-match-link"
                  href={`/matches/${m.id}`}
                >
                  {m.home_team_name} - {m.away_team_name}
                </Link>
                <div className="prediction-value">
                  {m.predicted_home_score !== null && m.predicted_away_score !== null
                    ? `${m.predicted_home_score} - ${m.predicted_away_score}`
                    : "Inget tips"}
                </div>
              </div>

              <div className="prediction-details small-text">
                <span>
                  Resultat:{" "}
                  {m.actual_home_score !== null && m.actual_away_score !== null
                    ? `${m.actual_home_score}-${m.actual_away_score}`
                    : "Inte spelad"}
                </span>
                <span>Poäng: {m.points_awarded ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
