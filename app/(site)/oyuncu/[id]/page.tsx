import { getPlayer } from "@/lib/data";
import { countryName } from "@/lib/countries";
import { flagEmoji, footLabel, formatKickoff, positionLabel } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getPlayer(id);
  return { title: data ? `${data.player.first_name} ${data.player.last_name}` : "Oyuncu" };
}

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="sheet" />}>
      <PlayerBody params={params} />
    </Suspense>
  );
}

async function PlayerBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPlayer(id);
  if (!data) notFound();
  const player = data.player;
  const rating = data.stats.avg_rating == null ? "—" : Number(data.stats.avg_rating).toFixed(1);

  return (
    <article className="profile">
      <p className="kicker">{positionLabel(player.position)}</p>
      <h1>
        {player.first_name} {player.last_name}
      </h1>
      <div className="identity">
        <p>
          {flagEmoji(player.nationality_code)} {countryName(player.nationality_code)}
          {player.age != null ? ` · ${player.age} yaş` : ""}
        </p>
        <p className="meta">
          {player.shirt_number != null ? `Forma ${player.shirt_number} · ` : ""}
          {player.height_cm ? `${player.height_cm} cm · ` : ""}
          Ayak {footLabel(player.preferred_foot)}
        </p>
        {player.team ? (
          <p>
            <Link href={`/takim/${player.team.slug}`}>{player.team.name}</Link>
          </p>
        ) : null}
      </div>
      <div className="stats">
        <div>
          <b className="num">{data.stats.apps}</b>
          <span>Maç</span>
        </div>
        <div>
          <b className="num">{data.stats.goals}</b>
          <span>Gol</span>
        </div>
        <div>
          <b className="num">{data.stats.assists}</b>
          <span>Asist</span>
        </div>
        <div>
          <b className="num">{rating}</b>
          <span>Reyting</span>
        </div>
        <div>
          <b className="num">
            {data.stats.yellow}/{data.stats.red}
          </b>
          <span>Kart</span>
        </div>
      </div>
      <section className="section">
        <h2>Son maçlar</h2>
        {data.recent.length === 0 ? (
          <p className="empty">
            <strong>Henüz maç yok.</strong>
          </p>
        ) : (
          <div className="list">
            {data.recent.map((match) => (
              <Link key={match.match_id} href={`/mac/${match.match_id}`} className="side" style={{ minHeight: 52 }}>
                <span>
                  {match.home.short_name} {match.home_score}-{match.away_score} {match.away.short_name}
                  <span className="meta"> · {formatKickoff(match.kickoff_at)}</span>
                </span>
                <span className="num">
                  {match.goals > 0 ? `${match.goals} gol` : ""}{" "}
                  {match.rating != null ? Number(match.rating).toFixed(1) : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
