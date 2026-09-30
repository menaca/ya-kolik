import { MatchList } from "@/components/match-list";
import { getFixtures } from "@/lib/data";
import type { MatchCard } from "@/lib/types";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Fikstür" };

export default function FixturesPage() {
  return (
    <Suspense fallback={<div className="sheet" />}>
      <FixturesBody />
    </Suspense>
  );
}

async function FixturesBody() {
  const data = await getFixtures();
  const groups = new Map<string, MatchCard[]>();
  for (const match of data.matches) {
    const key = match.matchweek ? `Hafta ${match.matchweek}` : "Haftasız";
    const list = groups.get(key) ?? [];
    list.push(match);
    groups.set(key, list);
  }

  return (
    <>
      <h2>Fikstür</h2>
      {data.matches.length === 0 ? (
        <p className="empty">
          <strong>Henüz fikstür yok.</strong>
        </p>
      ) : (
        [...groups.entries()].map(([week, matches]) => (
          <section key={week} className="section">
            <h2>{week}</h2>
            <MatchList matches={matches} serverNow={data.server_now} />
          </section>
        ))
      )}
    </>
  );
}
