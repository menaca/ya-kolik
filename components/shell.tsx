"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const TABS = [
  { href: "/canli", label: "Canlı" },
  { href: "/fikstur", label: "Fikstür" },
  { href: "/puan-durumu", label: "Puan" },
  { href: "/takimlar", label: "Takımlar" },
];

const ACCENTS = [
  { id: "mor", color: "#5B3A8C" },
  { id: "bordo", color: "#7A2E3A" },
  { id: "lacivert", color: "#1E3A5F" },
  { id: "orman", color: "#1F4D3A" },
  { id: "kizil", color: "#8E2F2F" },
  { id: "altin", color: "#8A6A2F" },
];

function active(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabLinks({
  className,
  pathname,
}: {
  className: string;
  pathname?: string;
}) {
  const router = useRouter();
  return (
    <nav className={className}>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          prefetch
          data-active={pathname ? active(pathname, tab.href) : false}
          onTouchStart={() => router.prefetch(tab.href)}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function ActiveTabs({ className }: { className: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(pathname);
  }, [pathname]);

  useEffect(() => {
    router.prefetch("/");
    for (const tab of TABS) router.prefetch(tab.href);
  }, [router]);

  return <TabLinks className={className} pathname={current ?? undefined} />;
}

function ThemeTools() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [accent, setAccentState] = useState("mor");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    setAccentState(document.documentElement.dataset.accent || "mor");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("yk-theme", next);
    setTheme(next);
  }

  function setAccent(id: string) {
    document.documentElement.dataset.accent = id;
    localStorage.setItem("yk-accent", id);
    setAccentState(id);
    setOpen(false);
  }

  return (
    <div className="top-tools">
      <Link href="/giris" className="text-link">
        Yönetim
      </Link>
      <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Tema">
        {theme === "dark" ? "Açık" : "Koyu"}
      </button>
      <button type="button" className="icon-btn" onClick={() => setOpen((value) => !value)} aria-label="Vurgu rengi">
        <i className="live-dot" />
      </button>
      {open ? (
        <div className="accent-menu">
          {ACCENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              style={{ ["--swatch" as string]: item.color }}
              data-on={accent === item.id}
              aria-label={item.id}
              onClick={() => setAccent(item.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand" prefetch>
          <strong>Ya-Kolik</strong>
          <span>Lig</span>
        </Link>
        <Suspense fallback={<TabLinks className="nav-desktop" />}>
          <ActiveTabs className="nav-desktop" />
        </Suspense>
        <ThemeTools />
      </header>
      <main className="page">{children}</main>
      <Suspense fallback={<TabLinks className="nav-mobile" />}>
        <ActiveTabs className="nav-mobile" />
      </Suspense>
    </div>
  );
}
