"use client";

import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  const [message, setMessage] = useState("");
  const [locked, setLocked] = useState(false);
  const [predictionsLockAt, setPredictionsLockAt] = useState("");

  async function loadSettings() {
    const data = await fetch("/api/admin/settings").then((r) => r.json());

    setLocked(Boolean(data.locked));

    if (data.settings?.predictions_lock_at) {
      const raw = data.settings.predictions_lock_at;
      const dt = new Date(raw);
      const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setPredictionsLockAt(local);
    }
  }

  useEffect(() => {
    (async () => {
      const data = await fetch("/api/me").then((r) => r.json());
      setUser(data.user);
      setLoaded(true);

      if (data.user?.role === "ADMIN") {
        await loadSettings();
      }
    })();
  }, []);

  async function save() {
    setMessage("");

    if (!predictionsLockAt) {
      setMessage("Fyll i en låstid");
      return;
    }

    const iso = new Date(predictionsLockAt).toISOString();

    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ predictionsLockAt: iso }),
    });

    const data = await res.json();
    setMessage(data.message || data.error);

    if (res.ok) {
      await loadSettings();
    }
  }

  if (!loaded) {
    return <div>Laddar...</div>;
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div>
        <h1 className="page-title">Admin - Inställningar</h1>
        <div className="message">Du har inte behörighet till den här sidan.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Admin - Inställningar</h1>
      <p className="page-subtitle">Hantera den globala låstiden för tips.</p>

      <div className="card">
        <div>
          <strong>Nuvarande status:</strong>{" "}
          <span className={locked ? "status-bad" : "status-ok"}>
            {locked ? "Låst" : "Öppen"}
          </span>
        </div>

        <div style={{ marginTop: 16 }}>
          <label>
            <div className="small-text" style={{ marginBottom: 6 }}>
              Låstid
            </div>
            <input
              type="datetime-local"
              value={predictionsLockAt}
              onChange={(e) => setPredictionsLockAt(e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginTop: 16 }}>
          <button onClick={save}>Spara inställningar</button>
        </div>

        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
}
