import Link from "next/link";
import HomeHeroLinks from "../components/HomeHeroLinks";
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
        <h2>VM-tipset 2026 är här!</h2>

        <p>
          Det är 2026 och ännu ett stort mästerskap står för dörren – och vårt
          kära fotbollslandslag tog sig dit, om än med hjärtat i halsgropen. Nu
          är det dags igen: VM-tipset är tillbaka, och vi siktar på ännu ett
          succéår!
        </p>

        <p>
          Vi kör vidare på det beprövade konceptet. Har du varit med tidigare vet
          du precis hur det fungerar – och är du ny rekommenderar vi att du tar
          en titt på reglerna efter att du har registrerat dig och loggat in.
        </p>

        <p>
          Du kan lämna in dina tips ända fram till första matchstart. Tänk bara
          på att betalningen också måste vara registrerad innan dess.
        </p>

        <p>Lycka till! ⚽</p>

        <HomeHeroLinks />
      </div>

      <div style={{ marginTop: 24 }}>
        <MatchesOverview />
      </div>
    </div>
  );
}
