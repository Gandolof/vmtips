"use client";

import { useEffect, useState } from "react";
import { formatDateTimeSv } from "../../../lib/date-format";

export default function AdminMatchesPage() {
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const [groupName, setGroupName] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [kickoffDate, setKickoffDate] = useState("");
  const [kickoffTime, setKickoffTime] = useState("");
  const [venue, setVenue] = useState("");

  async function load() {
    const data = await fetch("/api/admin/matches").then((r) => r.json());
    setMatches(data.matches || []);
    setTeams(data.teams || []);
  }

  useEffect(() => {
    (async () => {
      const data = await fetch("/api/me").then((r) => r.json());
      setUser(data.user);
      setLoaded(true);

      if (data.user?.role === "ADMIN") {
        await load();
      }
    })();
  }, []);

  async function createMatch() {
    setMessage("");

    if (!kickoffDate || !kickoffTime) {
      setMessage("Fyll i både datum och tid");
      return;
    }

    const kickoffAt = `${kickoffDate}T${kickoffTime}`;

    const res = await fetch("/api/admin/matches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupName,
        homeTeamId: Number(homeTeamId),
        awayTeamId: Number(awayTeamId),
        kickoffAt,
        venue,
      }),
    });

    const data = await res.json();
    setMessage(data.message || data.error);

    if (res.ok) {
      setGroupName("");
      setHomeTeamId("");
      setAwayTeamId("");
      setKickoffDate("");
      setKickoffTime("");
      setVenue("");
      await load();
    }
  }

  if (!loaded) {
    return <div>Laddar...</div>;
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div>
        <h1 className="page-title">Admin - Matcher</h1>
        <div className="message">Du har inte behörighet till den här sidan.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Admin - Matcher</h1>
      <p className="page-subtitle">Skapa och granska gruppspelsmatcher.</p>

      <div className="card">
        <h3>Skapa match</h3>

        <div className="form-row">
          <input
            placeholder="Grupp"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          <select value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)}>
            <option value="">Hemmalag</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <select value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)}>
            <option value="">Bortalag</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            inputMode="numeric"
            placeholder="yyyy-mm-dd"
            value={kickoffDate}
            onChange={(e) => setKickoffDate(e.target.value)}
          />

          <input
            type="time"
            value={kickoffTime}
            onChange={(e) => setKickoffTime(e.target.value)}
          />

          <input
            placeholder="Arena"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />

          <button onClick={createMatch}>Skapa</button>
        </div>

        {message && <div className="message">{message}</div>}
      </div>

      <div className="card">
        <h3>Befintliga matcher</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Grupp</th>
              <th>Hemma</th>
              <th>Borta</th>
              <th>Avspark</th>
              <th>Arena</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.id}>
                <td>{match.group_name}</td>
                <td>{match.home_team_name}</td>
                <td>{match.away_team_name}</td>
                <td>{formatDateTimeSv(match.kickoff_at)}</td>
                <td>{match.venue || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
