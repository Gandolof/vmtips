import Link from "next/link";
import MatchesOverview from "../components/MatchesOverview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return (
    <div>
      <h1 className="page-title">VM-Tipset 2026</h1>
      <p className="page-subtitle">
        Tippa alla gruppspelsmatcher, följ dina poäng och tävla mot dina
        vänner.
      </p>

      <div className="card">
        <h2>Så fungerar poängen</h2>
        <ul>
          <li>Exakt resultat = 10 poäng</li>
          <li>Rätt vinnare eller oavgjort = 8 minus totalt antal mål fel</li>
          <li>Fel utfall = 0 poäng</li>
        </ul>

        <div className="hero-links">
          <Link className="button" href="/login">
            Logga in
          </Link>
          <Link className="button" href="/test">
            Tippa
          </Link>
          <Link className="button" href="/leaderboard">
            Topplista
          </Link>
          <Link className="button-secondary button" href="/admin">
            Admin
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <MatchesOverview />
      </div>
    </div>
  );
}
