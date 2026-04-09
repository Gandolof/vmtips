"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HeaderUser() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  async function loadUser() {
    const data = await fetch("/api/me").then((r) => r.json());
    setUser(data.user);
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function logout() {
    await fetch("/api/logout", {
      method: "POST",
    });

    setUser(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="header-user">
      {user ? (
        <>
          <span>
            {user.name} {user.role === "ADMIN" ? "(admin)" : ""}
          </span>
          <button className="button-secondary" onClick={logout}>
            Logga ut
          </button>
        </>
      ) : (
        <span>Inte inloggad</span>
      )}
    </div>
  );
}
