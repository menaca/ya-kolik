import { MatchCenter } from "@/components/match-center";
import { getMatch } from "@/lib/data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getMatch(id);
  return {
    title: data ? `${data.match.home.short_name} ${data.match.home_score}-${data.match.away_score} ${data.match.away.short_name}` : "Maç",
  };
}

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="sheet" />}>
      <MatchBody params={params} />
    </Suspense>
  );
}

async function MatchBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getMatch(id);
  if (!data) notFound();
  return <MatchCenter initial={data} />;
}
