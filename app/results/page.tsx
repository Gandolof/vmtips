"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeSv } from "../../lib/date-format";

export default function ResultsPage() {
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  const [matches, setMatches] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function load() {
    const data = await fetch("/api/results-list", { cache: "no-store" }).then((r) => r.json());
    setMatches(data);
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

  async function save(matchId: number) {
    const homeInput = document.getElementById(`rh-${matchId}`) as HTMLInputElement;
    const awayInput = document.getElementById(`ra-${matchId}`) as HTMLInputElement;

    if (!homeInput || !awayInput) {
      setMessage("Saknar inmatningsfält");
      return;
    }

    const home = homeInput.value;
    const away = awayInput.value;

    if (home === "" || away === "") {
      setMessage("Fyll i båda resultaten");
      return;
    }

    const res = await fetch("/api/results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        matchId,
        actualHomeScore: Number(home),
        actualAwayScore: Number(away),
      }),
    });

    const data = await res.json();
    setMessage(data.message || data.error);

    await load();
    router.refresh();
  }

  if (!loaded) {
    return <div>Laddar...</div>;
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div>
        <h1 className="page-title">Mata in resultat</h1>
        <div className="message">Du har inte behörighet till den här sidan.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Mata in resultat</h1>
      <p className="page-subtitle">
        Spara slutresultat här. När du sparar räknas poängen om automatiskt.
      </p>

      {message && <div className="message">{message}</div>}

      {matches.map((m) => (
        <div className="card" key={m.id}>
          <div className="small-text" style={{ marginBottom: 10 }}>
            {m.group_name} · {formatDateTimeSv(m.kickoff_at)}
          </div>

          <div className="match-row">
            <div className="team-name">{m.home_team_name}</div>
            <input
              className="score-input"
              id={`rh-${m.id}`}
              type="number"
              min="0"
              defaultValue={
                m.actual_home_score !== null ? String(m.actual_home_score) : ""
              }
            />
            <div>-</div>
            <input
              className="score-input"
              id={`ra-${m.id}`}
              type="number"
              min="0"
              defaultValue={
                m.actual_away_score !== null ? String(m.actual_away_score) : ""
              }
            />
            <div className="team-name">{m.away_team_name}</div>
            <button onClick={() => save(m.id)}>Spara resultat</button>
          </div>

          <div className="small-text" style={{ marginTop: 10 }}>
            Nuvarande resultat:{" "}
            {m.actual_home_score !== null && m.actual_away_score !== null
              ? `${m.actual_home_score}-${m.actual_away_score}`
              : "Inte satt"}
          </div>
        </div>
      ))}
    </div>
  );
}
