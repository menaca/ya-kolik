import { slotPoints } from "@/lib/formations";
import type { LineupPlayer } from "@/lib/types";

export function Pitch({
  rows,
  starters,
}: {
  rows: number[];
  starters: LineupPlayer[];
}) {
  const points = slotPoints(rows);
  const bySlot = new Map(starters.map((player) => [player.slot_index ?? -1, player]));

  return (
    <div className="pitch-wrap">
      <svg viewBox="0 0 68 92" aria-hidden="true">
        <rect x="2" y="2" width="64" height="88" fill="none" stroke="var(--pitch-line)" strokeWidth="0.6" />
        <line x1="2" y1="46" x2="66" y2="46" stroke="var(--pitch-line)" strokeWidth="0.6" />
        <circle cx="34" cy="46" r="7" fill="none" stroke="var(--pitch-line)" strokeWidth="0.6" />
        <rect x="16" y="2" width="36" height="14" fill="none" stroke="var(--pitch-line)" strokeWidth="0.6" />
        <rect x="16" y="76" width="36" height="14" fill="none" stroke="var(--pitch-line)" strokeWidth="0.6" />
      </svg>
      {points.map((point) => {
        const player = bySlot.get(point.index);
        return (
          <span
            key={point.index}
            className={player ? "slot" : "slot empty-slot"}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            {player ? (
              <>
                <b className="num">{player.shirt_number ?? "·"}</b>
                <small>{player.name.split(" ").slice(-1)[0]}</small>
              </>
            ) : (
              <small>{point.index + 1}</small>
            )}
          </span>
        );
      })}
    </div>
  );
}
