"use client";

import { useEffect, useState } from "react";
import { MatchList } from "@/components/match-list";
import { isOnClock } from "@/lib/format";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { MatchCard } from "@/lib/types";

export function LiveBoard({
  initial,
  serverNow,
}: {
  initial: MatchCard[];
  serverNow: number;
}) {
  const [matches, setMatches] = useState(initial);
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    let timer = 0;
    const pull = () => {
      supabase.rpc("get_fixtures").then(({ data }) => {
        if (!data) return;
        const payload = data as { server_now: number; matches: MatchCard[] };
        setNow(payload.server_now);
        setMatches(payload.matches.filter((match) => isOnClock(match, payload.server_now)));
      });
    };
    const channel = supabase
      .channel("canli")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(pull, 150);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "match_events" }, () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(pull, 150);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") pull();
      });
    return () => {
      window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  if (matches.length === 0) {
    return (
      <p className="empty">
        <strong>Şu an canlı maç yok.</strong>
      </p>
    );
  }

  return <MatchList matches={matches} serverNow={now} />;
}
