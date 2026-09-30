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

function TabIcon({ href }: { href: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (href === "/canli") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }
  if (href === "/fikstur") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }
  if (href === "/puan-durumu") {
    return (
      <svg {...common}>
        <path d="M5 19V10M12 19V5M19 19v-7" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </svg>
  );
}

function TabLinks({
  className,
  pathname,
  icons,
}: {
  className: string;
  pathname?: string;
  icons?: boolean;
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
          {icons ? <TabIcon href={tab.href} /> : null}
          <span>{tab.label}</span>
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

  return (
    <TabLinks className={className} pathname={current ?? undefined} icons={className === "nav-mobile"} />
  );
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
          <span className="mark">YK</span>
          <strong>Ya-Kolik</strong>
        </Link>
        <Suspense fallback={<TabLinks className="nav-desktop" />}>
          <ActiveTabs className="nav-desktop" />
        </Suspense>
        <ThemeTools />
      </header>
      <main className="page">{children}</main>
      <Suspense fallback={<TabLinks className="nav-mobile" icons />}>
        <ActiveTabs className="nav-mobile" />
      </Suspense>
    </div>
  );
}
