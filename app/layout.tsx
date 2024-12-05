import "../styles/globals.css";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="bg-gray-800 text-white p-4 flex justify-between">
          <h1 className="text-xl">Lonerbox Data</h1>
          <nav>
            <Link href="/" className="mr-4 text-white hover:underline">
              Home
            </Link>
            <Link href="/organizations" className="text-white hover:underline">
              Organizations
            </Link>
            <Link href="/verdicts" className="text-white hover:underline">
              Verdicts
            </Link>
            <Link href="/timeline" className="text-white hover:underline">
              Timeline
            </Link>
            <Link href="/affiliation_losses" className="text-white hover:underline">
              AffiliationLosses
            </Link>
            <Link href="/civilian_losses" className="text-white hover:underline">
              CivilianLosses
            </Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="bg-gray-800 text-white p-4 text-center">
          <p>© 2024 Lonerbox Data</p>
        </footer>
      </body>
    </html>
  );
}
