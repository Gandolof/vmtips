"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function NavLinks() {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      const data = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json());
      setUser(data.user);
    })();
  }, [pathname]);

  return (
    <nav className="nav-links">
      <Link href="/login">Logga in</Link>
      <Link href="/predict">Tippa</Link>
      {user && <Link href="/rules">Regler</Link>}
      <Link href="/leaderboard">Topplista</Link>
    </nav>
  );
}
