import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTimeSv } from "../../../lib/date-format";
import { getFifaMatchUrl } from "../../../lib/fifa-match-links";
import { getMatchById, getPredictionsForMatch } from "../../../lib/queries";

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

  const predictions = getPredictionsForMatch(parsedMatchId);
  const fifaUrl = getFifaMatchUrl(match);

  return (
    <div>
      <h1 className="page-title">
        {match.home_team_name} - {match.away_team_name}
      </h1>
      <p className="page-subtitle">
        {match.group_name} · {formatDateTimeSv(match.kickoff_at)}
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="hero-links" style={{ marginTop: 0 }}>
          <Link href="/leaderboard">Topplista</Link>
          <Link href="/test">Tips</Link>
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
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Tips</h3>

        <table className="table">
          <thead>
            <tr>
              <th>Namn</th>
              <th>Tips</th>
              <th>Poäng</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((prediction) => (
              <tr key={prediction.user_id}>
                <td>
                  <Link href={`/leaderboard/${prediction.user_id}`}>
                    {prediction.name}
                  </Link>
                </td>
                <td>
                  {prediction.predicted_home_score !== null &&
                  prediction.predicted_away_score !== null
                    ? `${prediction.predicted_home_score}-${prediction.predicted_away_score}`
                    : "Inget tips"}
                </td>
                <td>{prediction.points_awarded ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
