import Link from "next/link";
import { logout } from "@/lib/actions";

const LINKS = [
  { href: "/panel", label: "Özet" },
  { href: "/panel/lig", label: "Lig" },
  { href: "/panel/takimlar", label: "Takımlar" },
  { href: "/panel/oyuncular", label: "Oyuncular" },
  { href: "/panel/fikstur", label: "Fikstür" },
];

export const instant = false;

export const metadata = {
  title: "Yönetim",
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel-page">
      <div className="panel-head">
        <p className="kicker">Ya-Kolik</p>
        <div className="side">
          <h1>Yönetim</h1>
          <span className="row-actions">
            <Link href="/" className="text-link">
              Site
            </Link>
            <form action={logout}>
              <button className="btn-ghost" type="submit">
                Çıkış
              </button>
            </form>
          </span>
        </div>
      </div>
      <nav className="panel-nav">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
