"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MinuteBadge } from "@/components/minute-badge";
import { Pitch } from "@/components/pitch";
import { eventMinute, eventText, formatKickoff } from "@/lib/format";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { MatchPayload } from "@/lib/types";

export function MatchCenter({ initial }: { initial: MatchPayload }) {
  const [data, setData] = useState(initial);
  const match = data.match;
  const motm = data.ratings.find((row) => row.is_motm);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    let timer = 0;
    const pull = () => {
      supabase.rpc("get_match", { mid: initial.match.id }).then(({ data: next }) => {
        if (next) setData(next as MatchPayload);
      });
    };
    const channel = supabase
      .channel(`mac-${initial.match.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${initial.match.id}` },
        () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(pull, 150);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_events", filter: `match_id=eq.${initial.match.id}` },
        () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(pull, 150);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_ratings", filter: `match_id=eq.${initial.match.id}` },
        () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(pull, 150);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") pull();
      });
    return () => {
      window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [initial.match.id]);

  return (
    <article>
      <p className="kicker">{match.competition_name || "Maç"}</p>
      <div className="match-row">
        <MinuteBadge match={match} serverNow={data.server_now} />
        <span className="sides">
          <span className="side">
            <b>
              <Link href={`/takim/${match.home.slug}`}>{match.home.name}</Link>
            </b>
            <span className="num">{match.home_score}</span>
          </span>
          <span className="side">
            <b>
              <Link href={`/takim/${match.away.slug}`}>{match.away.name}</Link>
            </b>
            <span className="num">{match.away_score}</span>
          </span>
        </span>
      </div>
      <p className="meta">
        {formatKickoff(match.kickoff_at)}
        {match.venue ? ` · ${match.venue}` : ""} · {match.players_per_side} kişi · {match.half_minutes} dk
      </p>

      {motm ? (
        <div className="motm">
          <p className="kicker">Maçın adamı</p>
          <p>
            <Link href={`/oyuncu/${motm.player_id}`}>{motm.name}</Link>{" "}
            <span className="num">{Number(motm.rating).toFixed(1)}</span>
          </p>
        </div>
      ) : null}

      <section className="section">
        <h2>Olaylar</h2>
        {data.events.length === 0 ? (
          <p className="empty">
            <strong>Henüz olay yok.</strong>
          </p>
        ) : (
          <div className="event-list">
            {data.events.map((event) => (
              <p key={event.id} className="meta">
                {eventMinute(event.minute, event.extra_minute)}{" "}
                {eventText(event.type, event.player_name, event.related_name)}
              </p>
            ))}
          </div>
        )}
      </section>

      {data.lineups ? (
        <section className="section split">
          <div>
            <h2>{match.home.short_name}</h2>
            <Pitch rows={data.lineups.home.formation.rows} starters={data.lineups.home.starters} />
            <div className="bench">
              {data.lineups.home.bench.map((player) => (
                <span key={player.player_id} className="chip">
                  {player.shirt_number ?? "·"} {player.name}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h2>{match.away.short_name}</h2>
            <Pitch rows={data.lineups.away.formation.rows} starters={data.lineups.away.starters} />
            <div className="bench">
              {data.lineups.away.bench.map((player) => (
                <span key={player.player_id} className="chip">
                  {player.shirt_number ?? "·"} {player.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <p className="empty">
          <strong>Kadro henüz açıklanmadı.</strong>
        </p>
      )}

      {match.status === "ft" ? (
        <section className="section">
          <h2>Reytingler</h2>
          {data.ratings.length === 0 ? (
            <p className="empty">
              <strong>Reytingler henüz girilmedi.</strong>
            </p>
          ) : (
            <div className="list">
              {data.ratings.map((row) => (
                <p key={row.player_id} className="side" style={{ minHeight: 40 }}>
                  <Link href={`/oyuncu/${row.player_id}`}>{row.name}</Link>
                  <span className="num">{Number(row.rating).toFixed(1)}</span>
                </p>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {data.h2h.length > 0 ? (
        <section className="section">
          <h2>Aralarındaki maçlar</h2>
          <div className="list">
            {data.h2h.map((item) => (
              <Link key={item.id} href={`/mac/${item.id}`} className="side" style={{ minHeight: 44 }}>
                <span>
                  {item.home.short_name} {item.home_score}-{item.away_score} {item.away.short_name}
                </span>
                <span className="meta">{formatKickoff(item.kickoff_at)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
