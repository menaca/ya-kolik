import { LiveBoard } from "@/components/live-board";
import { getFixtures } from "@/lib/data";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Canlı" };

export default function LivePage() {
  return (
    <Suspense fallback={<div className="sheet" />}>
      <LiveBody />
    </Suspense>
  );
}

async function LiveBody() {
  const data = await getFixtures();
  const live = data.matches.filter((match) => match.status === "live" || match.status === "ht");
  return (
    <>
      <h2>Canlı skor</h2>
      <LiveBoard initial={live} serverNow={data.server_now} />
    </>
  );
}
