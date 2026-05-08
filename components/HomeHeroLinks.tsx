"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function HomeHeroLinks() {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      const data = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json());
      setUser(data.user);
    })();
  }, [pathname]);

  return (
    <div className="hero-links">
      <Link className="button" href="/predict">
        Tippa
      </Link>
      {user && (
        <Link className="button" href="/rules">
          Regler
        </Link>
      )}
      <Link className="button" href="/leaderboard">
        Topplista
      </Link>
      {user?.role === "ADMIN" && (
        <Link className="button-secondary button" href="/admin">
          Admin
        </Link>
      )}
    </div>
  );
}
