import { MatchList } from "@/components/match-list";
import { StandingsTable } from "@/components/standings-table";
import { getHome } from "@/lib/data";
import { formatKickoff, isOnClock } from "@/lib/format";
import Link from "next/link";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="sheet" />}>
      <HomeBody />
    </Suspense>
  );
}

async function HomeBody() {
  const data = await getHome();
  const liveIds = new Set(data.live.map((match) => match.id));
  const live = [
    ...data.live,
    ...data.today.filter((match) => !liveIds.has(match.id) && isOnClock(match, data.server_now)),
  ];
  const today = data.today.filter((match) => !isOnClock(match, data.server_now));
  const bare =
    !data.competition &&
    data.live.length === 0 &&
    data.today.length === 0 &&
    data.recent.length === 0;

  return (
    <>
      {bare ? (
        <p className="empty">
          <strong>Lig henüz kurulmadı.</strong>
          Fikstür yayınlanınca maçlar burada görünecek.
        </p>
      ) : null}

      {data.featured?.next ? (
        <Link href={`/mac/${data.featured.next.id}`} className="featured" prefetch>
          <p className="kicker">{data.featured.team.short_name}</p>
          <p>
            {data.featured.next.home.short_name} – {data.featured.next.away.short_name}
          </p>
          <p className="meta">{formatKickoff(data.featured.next.kickoff_at)}</p>
        </Link>
      ) : null}

      {live.length > 0 ? (
        <section className="section">
          <h2>Canlı</h2>
          <MatchList matches={live} serverNow={data.server_now} />
        </section>
      ) : null}

      <section className="section">
        <h2>Bugün</h2>
        {today.length === 0 ? (
          <p className="empty">
            <strong>Bugün maç yok.</strong>
          </p>
        ) : (
          <MatchList matches={today} serverNow={data.server_now} />
        )}
      </section>

      <section className="section">
        <h2>{data.competition ? `${data.competition.name} ${data.competition.season}` : "Puan durumu"}</h2>
        {data.standings.length === 0 ? (
          <p className="empty">
            <strong>Puan durumu boş.</strong>
          </p>
        ) : (
          <StandingsTable rows={data.standings.slice(0, 8)} />
        )}
      </section>

      {data.recent.length > 0 ? (
        <section className="section">
          <h2>Sonuçlar</h2>
          <MatchList matches={data.recent} serverNow={data.server_now} />
        </section>
      ) : null}
    </>
  );
}
