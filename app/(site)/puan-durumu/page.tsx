import { StandingsTable } from "@/components/standings-table";
import { getStandings } from "@/lib/data";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Puan durumu" };

export default function TablePage() {
  return (
    <Suspense fallback={<div className="sheet" />}>
      <TableBody />
    </Suspense>
  );
}

async function TableBody() {
  const data = await getStandings();
  return (
    <>
      <h2>{data.competition ? `${data.competition.name} ${data.competition.season}` : "Puan durumu"}</h2>
      {data.rows.length === 0 ? (
        <p className="empty">
          <strong>Puan durumu boş.</strong>
        </p>
      ) : (
        <StandingsTable rows={data.rows} />
      )}
    </>
  );
}
