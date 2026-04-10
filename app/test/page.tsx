"use client";

import { useEffect, useState } from "react";
import { formatDateTimeSv } from "../../lib/date-format";

export default function TestPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>({});
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [locked, setLocked] = useState(false);
  const [lockTime, setLockTime] = useState<string>("");
  const [activePredictionSet, setActivePredictionSet] = useState<1 | 2>(1);
  const [showSecondPredictionSet, setShowSecondPredictionSet] = useState(false);

  async function loadUser() {
    const data = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json());
    setUser(data.user);
    return data.user;
  }

  async function loadMatches(userId: number, predictionSet: 1 | 2) {
    const data = await fetch(
      `/api/test-matches-v2?userId=${userId}&predictionSet=${predictionSet}`,
      {
      cache: "no-store",
      }
    ).then((r) => r.json());
    setMatches(data.matches || []);
    setScores(
      Object.fromEntries(
        (data.matches || []).map((match: any) => [
          match.id,
          {
            home:
              match.predicted_home_score !== null
                ? String(match.predicted_home_score)
                : "",
            away:
              match.predicted_away_score !== null
                ? String(match.predicted_away_score)
                : "",
          },
        ])
      )
    );

    return Boolean(data.hasPredictions);
  }

  async function loadSettings() {
    const data = await fetch("/api/settings", { cache: "no-store" }).then((r) => r.json());
    setLocked(Boolean(data.locked));
    setLockTime(data.settings?.predictions_lock_at ?? "");
  }

  useEffect(() => {
    (async () => {
      const currentUser = await loadUser();

      if (!currentUser) {
        setMessage("Inte inloggad.");
        return;
      }

      const secondSetExists = await loadMatches(currentUser.id, 2);
      setShowSecondPredictionSet(secondSetExists);
      await loadMatches(currentUser.id, 1);
      await loadSettings();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) return;
      await loadMatches(user.id, activePredictionSet);
    })();
  }, [activePredictionSet, user]);

  function updateScore(matchId: number, side: "home" | "away", value: string) {
    setScores((current) => ({
      ...current,
      [matchId]: {
        home: current[matchId]?.home ?? "",
        away: current[matchId]?.away ?? "",
        [side]: value,
      },
    }));
  }

  async function saveAll() {
    if (!user) {
      setMessage("Inte inloggad.");
      return;
    }

    if (locked) {
      setMessage("Tipsen är låsta.");
      return;
    }

    const predictions = matches.map((match) => ({
      matchId: match.id,
      predictedHomeScore: Number(scores[match.id]?.home ?? ""),
      predictedAwayScore: Number(scores[match.id]?.away ?? ""),
    }));

    if (
      predictions.some(
        (prediction) =>
          Number.isNaN(prediction.predictedHomeScore) ||
          Number.isNaN(prediction.predictedAwayScore)
      )
    ) {
      setMessage("Fyll i båda resultaten för alla matcher innan du sparar.");
      return;
    }

    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user.id,
        predictionSet: activePredictionSet,
        predictions,
      }),
    });

    const data = await res.json();
    setMessage(data.message || data.error);

    if (activePredictionSet === 2) {
      setShowSecondPredictionSet(true);
    }

    await loadMatches(user.id, activePredictionSet);
    await loadSettings();
  }

  return (
    <div>
      <h1 className="page-title">Tips</h1>
      <p className="page-subtitle">
        {user
          ? `Inloggad som ${user.name}. Du redigerar tipsuppsättning ${activePredictionSet}.`
          : "Fyll i dina tips nedan."}
      </p>

      {!user && <div className="message">Du måste logga in först.</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        {user && (
          <div className="hero-links" style={{ marginTop: 0, marginBottom: 16 }}>
            <button
              className={activePredictionSet === 1 ? "" : "button-secondary"}
              onClick={() => setActivePredictionSet(1)}
            >
              Tips 1
            </button>

            {showSecondPredictionSet ? (
              <button
                className={activePredictionSet === 2 ? "" : "button-secondary"}
                onClick={() => setActivePredictionSet(2)}
              >
                Tips 2
              </button>
            ) : (
              <button
                className="button-secondary"
                disabled={locked}
                onClick={() => {
                  setShowSecondPredictionSet(true);
                  setActivePredictionSet(2);
                  setMessage("");
                }}
              >
                Lägg till tips 2
              </button>
            )}
          </div>
        )}

        <div>
          <strong>Status:</strong>{" "}
          <span className={locked ? "status-bad" : "status-ok"}>
            {locked ? "Tipsen är låsta" : "Tipsen är öppna"}
          </span>
        </div>

        {lockTime && (
          <div style={{ marginTop: 8 }}>
            <strong>Låstid:</strong> {formatDateTimeSv(lockTime)}
          </div>
        )}

        {message && <div className="message">{message}</div>}

        {user && (
          <div style={{ marginTop: 16 }}>
            <button onClick={saveAll} disabled={locked || !user || matches.length === 0}>
              Spara alla tips
            </button>
          </div>
        )}
      </div>

      {matches.length > 0 && (
        <div className="card">
          <div className="prediction-toolbar">
            <div className="small-text">{matches.length} matcher</div>
          </div>

          <div className="prediction-list">
            {matches.map((m) => (
              <div className="prediction-item" key={m.id}>
                <div className="prediction-meta">
                  {m.group_name} · {formatDateTimeSv(m.kickoff_at)}
                </div>

                <div className="prediction-main">
                  <a
                    className="prediction-match-link"
                    href={`/matches/${m.id}`}
                  >
                    {m.home_team_name} - {m.away_team_name}
                  </a>
                  <input
                    className="score-input"
                    id={`home-${m.id}`}
                    type="number"
                    min="0"
                    disabled={locked || !user}
                    value={scores[m.id]?.home ?? ""}
                    onChange={(e) => updateScore(m.id, "home", e.target.value)}
                  />
                  <div className="prediction-separator">-</div>
                  <input
                    className="score-input"
                    id={`away-${m.id}`}
                    type="number"
                    min="0"
                    disabled={locked || !user}
                    value={scores[m.id]?.away ?? ""}
                    onChange={(e) => updateScore(m.id, "away", e.target.value)}
                  />
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

          <div className="prediction-toolbar" style={{ marginTop: 16 }}>
            <div className="small-text">Slut på listan</div>
            <button onClick={saveAll} disabled={locked || !user}>
              Spara alla tips
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
