"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [latestBackup, setLatestBackup] = useState<any>(null);
  const [passwords, setPasswords] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");

  async function loadUsers() {
    const data = await fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json());
    setUsers(Array.isArray(data) ? data : []);
  }

  async function loadBackupInfo() {
    const data = await fetch("/api/admin/backup", { cache: "no-store" }).then((r) => r.json());
    setLatestBackup(data.latestBackup ?? null);
    setBackups(Array.isArray(data.backups) ? data.backups : []);
  }

  useEffect(() => {
    (async () => {
      const data = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json());
      setUser(data.user);
      setLoaded(true);

      if (data.user?.role === "ADMIN") {
        await loadUsers();
        await loadBackupInfo();
      }
    })();
  }, []);

  async function resetPassword(userId: number) {
    setMessage("");

    const password = passwords[userId]?.trim() || "";
    if (!password) {
      setMessage("Fyll i ett nytt lösenord först.");
      return;
    }

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, password }),
    });

    const data = await res.json();
    setMessage(data.message || data.error);

    if (res.ok) {
      setPasswords((current) => ({ ...current, [userId]: "" }));
    }
  }

  async function makeAdmin(userId: number) {
    setMessage("");

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    setMessage(data.message || data.error);

    if (res.ok) {
      await loadUsers();
    }
  }

  async function createBackup() {
    setMessage("");

    const res = await fetch("/api/admin/backup", {
      method: "POST",
    });

    const data = await res.json();
    setMessage(data.message || data.error);

    if (res.ok) {
      setLatestBackup(data.backup ?? null);
      setBackups(Array.isArray(data.backups) ? data.backups : []);
    }
  }

  function downloadBackup(filename: string) {
    window.location.href = `/api/admin/backup?download=1&filename=${encodeURIComponent(filename)}`;
  }

  async function restoreBackup(filename: string) {
    setMessage("");

    const confirmed = window.confirm(
      `Är du säker på att du vill återställa ${filename}? Nuvarande data skrivs över.`
    );

    if (!confirmed) {
      return;
    }

    const res = await fetch("/api/admin/backup", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename }),
    });

    const data = await res.json();
    setMessage(data.message || data.error);

    if (res.ok) {
      await loadUsers();
      await loadBackupInfo();
    }
  }

  if (!loaded) {
    return <div>Laddar...</div>;
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div>
        <h1 className="page-title">Admin</h1>
        <div className="message">Du har inte behörighet till den här sidan.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Admin</h1>
      <p className="page-subtitle">
        Använd de här sidorna för att förbereda turneringen och hantera tipset.
      </p>

      {message && <div className="message">{message}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h3>Lag</h3>
          <p className="small-text">Skapa lagen som används i gruppspelet.</p>
          <Link href="/admin/teams">Gå till lag</Link>
        </div>

        <div className="card">
          <h3>Matcher</h3>
          <p className="small-text">Skapa gruppspelsmatcher och avsparkstider.</p>
          <Link href="/admin/matches">Gå till matcher</Link>
        </div>

        <div className="card">
          <h3>Inställningar</h3>
          <p className="small-text">Uppdatera den globala låstiden för tips.</p>
          <Link href="/admin/settings">Gå till inställningar</Link>
        </div>

        <div className="card">
          <h3>Resultat</h3>
          <p className="small-text">Mata in slutresultat och räkna om poängen.</p>
          <Link href="/results">Gå till resultat</Link>
        </div>

        <div className="card" style={{ gridRow: "span 2" }}>
          <h3>Backup</h3>
          <p className="small-text">
            Skapa backup och återställ någon av de fem senaste databackuperna.
          </p>

          <div className="small-text" style={{ marginBottom: 12 }}>
            {latestBackup ? (
              <>
                Senaste backup: {latestBackup.filename}
                <br />
                Skapad: {new Date(latestBackup.createdAt).toLocaleString("sv-SE")}
              </>
            ) : (
              "Ingen backup skapad ännu."
            )}
          </div>

          <div className="hero-links" style={{ marginTop: 0 }}>
            <button onClick={createBackup}>Skapa backup</button>
          </div>

          {backups.length > 0 && (
            <table className="table" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Fil</th>
                  <th>Skapad</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.filename}>
                    <td>{backup.filename}</td>
                    <td>{new Date(backup.createdAt).toLocaleString("sv-SE")}</td>
                    <td>
                      <button
                        className="button-secondary"
                        onClick={() => downloadBackup(backup.filename)}
                      >
                        Ladda ner
                      </button>
                    </td>
                    <td>
                      <button
                        className="button-secondary"
                        onClick={() => restoreBackup(backup.filename)}
                      >
                        Återställ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Användare</h3>
        <p className="small-text">
          Se registrerade användare och återställ lösenord vid behov.
        </p>

        <table className="table">
          <thead>
            <tr>
              <th>Namn</th>
              <th>E-post</th>
              <th>Roll</th>
              <th>Admin</th>
              <th>Nytt lösenord</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((listedUser) => (
              <tr key={listedUser.id}>
                <td>{listedUser.name}</td>
                <td>{listedUser.email || "-"}</td>
                <td>{listedUser.role}</td>
                <td>
                  {listedUser.role === "ADMIN" ? (
                    <span className="status-ok">Admin</span>
                  ) : (
                    <button onClick={() => makeAdmin(listedUser.id)}>
                      Gör till admin
                    </button>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Nytt lösenord"
                    value={passwords[listedUser.id] ?? ""}
                    onChange={(e) =>
                      setPasswords((current) => ({
                        ...current,
                        [listedUser.id]: e.target.value,
                      }))
                    }
                  />
                </td>
                <td>
                  <button onClick={() => resetPassword(listedUser.id)}>
                    Återställ lösenord
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
