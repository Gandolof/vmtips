"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const data = await fetch("/api/me").then((r) => r.json());
      setUser(data.user);
      setLoaded(true);
    })();
  }, []);

  async function register() {
    setMessage("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    setMessage(data.message || data.error);

    if (res.ok) {
      setMode("login");
    }
  }

  async function login() {
    setMessage("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setMessage(data.message || data.error);

    if (res.ok) {
      router.push("/test");
      router.refresh();
    }
  }

  if (!loaded) {
    return <div>Laddar...</div>;
  }

  return (
    <div>
      <h1 className="page-title">
        {mode === "login" ? "Logga in" : "Skapa konto"}
      </h1>
      <p className="page-subtitle">
        {mode === "login"
          ? "Logga in med din e-postadress och ditt lösenord."
          : "Skapa ett personligt konto för tipset."}
      </p>

      <div className="card" style={{ maxWidth: 520 }}>
        {user && (
          <div style={{ marginBottom: 16 }}>
            <div className="message" style={{ marginTop: 0 }}>
              Du är redan inloggad som <strong>{user.name}</strong>.
            </div>
            <div className="hero-links" style={{ marginTop: 12 }}>
              <Link className="button" href="/test">
                Gå till tipsen
              </Link>
              {user.role === "ADMIN" && (
                <Link className="button-secondary button" href="/admin">
                  Gå till admin
                </Link>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setMode("login")} disabled={mode === "login"}>
            Logga in
          </button>
          <button
            className="button-secondary"
            onClick={() => setMode("register")}
            disabled={mode === "register"}
          >
            Registrera
          </button>
        </div>

        <div className="form-row" style={{ marginBottom: 12 }}>
          {mode === "register" && (
            <input
              placeholder="Ditt namn"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            placeholder="E-post"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Lösenord"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {mode === "login" ? (
          <button onClick={login} disabled={Boolean(user)}>
            Logga in
          </button>
        ) : (
          <button onClick={register} disabled={Boolean(user)}>
            Skapa konto
          </button>
        )}

        {message && <div className="message">{message}</div>}

        <div style={{ marginTop: 16 }} className="small-text">
          Efter inloggning går du till <Link href="/test">Tips</Link>.
        </div>
      </div>
    </div>
  );
}
