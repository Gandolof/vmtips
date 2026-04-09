"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await fetch("/api/me").then((r) => r.json());
      setUser(data.user);
      setLoaded(true);
    })();
  }, []);

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
      </div>
    </div>
  );
}
