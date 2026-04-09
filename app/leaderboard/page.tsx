import Link from "next/link";
import { getLeaderboard } from "../../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeaderboardPage() {
  const rows = getLeaderboard();

  return (
    <div>
      <h1 className="page-title">Topplista</h1>
      <p className="page-subtitle">Aktuell ställning för alla deltagare.</p>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Placering</th>
              <th>Namn</th>
              <th>Poäng</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, index: number) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>
                  <Link href={`/leaderboard/${row.id}`}>{row.name}</Link>
                </td>
                <td>{row.total_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
