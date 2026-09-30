import Link from "next/link";
import { MinuteBadge } from "@/components/minute-badge";
import type { MatchCard } from "@/lib/types";

export function MatchList({
  matches,
  serverNow,
}: {
  matches: MatchCard[];
  serverNow: number;
}) {
  return (
    <div className="list">
      {matches.map((match) => (
        <Link key={match.id} href={`/mac/${match.id}`} className="match-row" prefetch>
          <MinuteBadge match={match} serverNow={serverNow} />
          <span className="sides">
            <span className="side">
              <b>{match.home.short_name}</b>
              <span className="num">{match.home_score}</span>
            </span>
            <span className="side">
              <b>{match.away.short_name}</b>
              <span className="num">{match.away_score}</span>
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
