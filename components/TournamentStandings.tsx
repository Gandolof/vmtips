import type { TournamentGroup } from "../lib/queries";

export default function TournamentStandings({
  groups,
}: {
  groups: TournamentGroup[];
}) {
  return (
    <div className="grid grid-2 standings-grid">
      {groups.map((group) => (
        <div className="card tournament-highlight-card" key={group.groupName}>
          <h3 className="group-title">Grupp {group.groupName}</h3>

          <div className="standings-table-wrap">
            <table className="table standings-table">
              <thead>
                <tr>
                  <th>Lag</th>
                  <th>M</th>
                  <th>V</th>
                  <th>O</th>
                  <th>F</th>
                  <th>GM</th>
                  <th>IM</th>
                  <th>MS</th>
                  <th>P</th>
                </tr>
              </thead>
              <tbody>
                {group.standings.map((team) => (
                  <tr key={team.teamId}>
                    <td>{team.teamName}</td>
                    <td>{team.played}</td>
                    <td>{team.won}</td>
                    <td>{team.drawn}</td>
                    <td>{team.lost}</td>
                    <td>{team.goalsFor}</td>
                    <td>{team.goalsAgainst}</td>
                    <td>{team.goalDifference}</td>
                    <td>
                      <strong>{team.points}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
