"use client";

import { useEffect, useState } from "react";
import { presentMatch } from "@/lib/format";
import type { MatchCard } from "@/lib/types";

export function MinuteBadge({
  match,
  serverNow,
}: {
  match: MatchCard;
  serverNow: number;
}) {
  const initial = presentMatch(match, serverNow || null);
  const [view, setView] = useState(initial);

  useEffect(() => {
    const tick = () => setView(presentMatch(match, Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [match]);

  return <span className={view.live ? "minute live" : "minute"}>{view.label}</span>;
}
