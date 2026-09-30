import Link from "next/link";
import { MinuteBadge } from "@/components/minute-badge";
import type { MatchCard } from "@/lib/types";

function kickedOff(match: MatchCard, serverNow: number) {
  if (match.status !== "scheduled") return true;
  if (!match.auto_start || !serverNow) return false;
  return Date.parse(match.kickoff_at) <= serverNow;
}

export function MatchList({
  matches,
  serverNow,
}: {
  matches: MatchCard[];
  serverNow: number;
}) {
  return (
    <div className="board">
      {matches.map((match) => {
        const started = kickedOff(match, serverNow);
        return (
          <Link key={match.id} href={`/mac/${match.id}`} className="match-row" prefetch>
            <span className="team home">{match.home.short_name}</span>
            <span className="mid">
              {started ? (
                <span className="score num">
                  {match.home_score}
                  <span>-</span>
                  {match.away_score}
                </span>
              ) : null}
              <MinuteBadge match={match} serverNow={serverNow} />
            </span>
            <span className="team away">{match.away.short_name}</span>
          </Link>
        );
      })}
    </div>
  );
}
