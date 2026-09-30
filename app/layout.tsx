import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const display = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Ya-Kolik", template: "%s · Ya-Kolik" },
  description: "Lig fikstürü, canlı skor, kadro ve maç merkezi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e8eaee",
};

const themeBoot = `try{var d=document.documentElement;var t=localStorage.getItem("yk-theme");var a=localStorage.getItem("yk-accent");var accents=["mor","bordo","lacivert","orman","kizil","altin"];d.dataset.theme=t==="dark"?"dark":"light";d.dataset.accent=accents.indexOf(a)>=0?a:"mor";}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      data-theme="light"
      data-accent="mor"
      className={`${sans.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script id="theme-boot" dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
