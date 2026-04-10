"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function HeaderUser() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  async function loadUser() {
    const data = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json());
    setUser(data.user);
  }

  useEffect(() => {
    loadUser();
  }, [pathname]);

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
