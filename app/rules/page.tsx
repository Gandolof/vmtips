export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RulesPage() {
  return (
    <div>
      <h1 className="page-title">Regler</h1>
      <p className="page-subtitle">
        Här hittar du poängsystemet och det praktiska upplägget för tipset.
      </p>

      <div className="card">
        <p>
          Vi vet – det kan se lite krångligt ut vid första anblick. Men lugn,
          det här är ett beprövat system som rullat på i många år. Har du varit
          med tidigare kommer du känna igen dig direkt. Är du ny? Inga problem –
          fråga någon rutinerad i gänget så är du snabbt med i matchen 👍
        </p>

        <h2>Så här funkar poängen:</h2>

        <p>
          Vi tar ett exempel där Japan slår Sverige med 2–1:
        </p>

        <p>
          <strong>Match: Japan – Sverige 2–1</strong>
        </p>

        <ul>
          <li>Ditt tips: 2–1 Fullträff! Rätt resultat → 10 poäng</li>
          <li>Ditt tips: 3–1 Rätt vinnare, 1 mål ifrån → 8 – 1 = 7 poäng</li>
          <li>Ditt tips: 4–2 Rätt vinnare, 3 mål ifrån → 8 – 3 = 5 poäng</li>
          <li>Ditt tips: 2–2 Fel vinnare (krysset), men nära → 5 – 1 = 4 poäng</li>
          <li>Ditt tips: 1–2 Helt fel → 0 poäng</li>
        </ul>

        <h2>Insats & spel:</h2>

        <ul>
          <li>100 kr per rad</li>
          <li>Max 2 rader per person</li>
        </ul>

        <h2>Betalning:</h2>

        <p>
          Betalas till Per – antingen live när vi ses eller via Swish: 072 251
          6192
        </p>

        <h2>Prispott:</h2>

        <p>Alla pengar går tillbaka till vinnarna:</p>

        <ul>
          <li>🥇 1:a plats – 50%</li>
          <li>🥈 2:a plats – 30%</li>
          <li>🥉 3:e plats – 20%</li>
        </ul>

        <p>Kort sagt: allt in – allt ut. Bara ära (och cash) på spel! 💰⚽</p>
      </div>
    </div>
  );
}
