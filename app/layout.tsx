import "./globals.css";
import Link from "next/link";
import HeaderUser from "../components/HeaderUser";
import NavLinks from "../components/NavLinks";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv-SE">
      <body>
        <header className="site-header">
          <div className="container nav-row">
            <div className="brand">
              <Link href="/">VM Tips</Link>
            </div>

            <NavLinks />

            <HeaderUser />
          </div>
        </header>

        <main className="container page-content">{children}</main>
      </body>
    </html>
  );
}
