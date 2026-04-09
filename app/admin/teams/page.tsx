"use client";

import { useEffect, useState } from "react";

export default function AdminTeamsPage() {
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  const [teams, setTeams] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [groupName, setGroupName] = useState("");

  async function loadTeams() {
    const data = await fetch("/api/admin/teams").then((r) => r.json());
    setTeams(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    (async () => {
      const data = await fetch("/api/me").then((r) => r.json());
      setUser(data.user);
      setLoaded(true);

      if (data.user?.role === "ADMIN") {
        await loadTeams();
      }
    })();
  }, []);

  async function createTeam() {
    setMessage("");

    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, code, groupName }),
    });

    const data = await res.json();
    setMessage(data.message || data.error);

    if (res.ok) {
      setName("");
      setCode("");
      setGroupName("");
      await loadTeams();
    }
  }

  if (!loaded) {
    return <div>Laddar...</div>;
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div>
        <h1 className="page-title">Admin - Lag</h1>
        <div className="message">Du har inte behörighet till den här sidan.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Admin - Lag</h1>
      <p className="page-subtitle">Skapa lag och granska den aktuella listan.</p>

      <div className="card">
        <h3>Skapa lag</h3>
        <div className="form-row">
          <input
            placeholder="Lagnamn"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Kod"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <input
            placeholder="Grupp"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <button onClick={createTeam}>Skapa</button>
        </div>

        {message && <div className="message">{message}</div>}
      </div>

      <div className="card">
        <h3>Befintliga lag</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Namn</th>
              <th>Kod</th>
              <th>Grupp</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id}>
                <td>{team.name}</td>
                <td>{team.code}</td>
                <td>{team.group_name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
