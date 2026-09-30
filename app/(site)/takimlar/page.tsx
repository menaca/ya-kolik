import { getTeamList } from "@/lib/data";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Takımlar" };

export default function TeamsPage() {
  return (
    <Suspense fallback={<div className="sheet" />}>
      <TeamsBody />
    </Suspense>
  );
}

async function TeamsBody() {
  const teams = await getTeamList();
  return (
    <>
      <h2>Takımlar</h2>
      {teams.length === 0 ? (
        <p className="empty">
          <strong>Henüz takım yok.</strong>
        </p>
      ) : (
        <div className="list">
          {teams.map((team) => (
            <Link key={team.id} href={`/takim/${team.slug}`} className="side" style={{ minHeight: 52 }} prefetch>
              <b>{team.name}</b>
              <span className="meta">{team.city || team.short_name}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
