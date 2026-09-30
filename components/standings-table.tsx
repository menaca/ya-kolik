import Link from "next/link";
import type { StandingRow } from "@/lib/types";

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="table-wrap board">
      <table className="grid">
        <thead>
          <tr>
            <th className="team">Takım</th>
            <th>O</th>
            <th>G</th>
            <th>B</th>
            <th>M</th>
            <th>A</th>
            <th>Y</th>
            <th>AV</th>
            <th>P</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.team_id}>
              <td className="team">
                <Link href={`/takim/${row.slug}`}>
                  {index + 1} {row.short_name}
                </Link>
              </td>
              <td className="num">{row.played}</td>
              <td className="num">{row.won}</td>
              <td className="num">{row.drawn}</td>
              <td className="num">{row.lost}</td>
              <td className="num">{row.goals_for}</td>
              <td className="num">{row.goals_against}</td>
              <td className="num">{row.goal_diff}</td>
              <td className="num points">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
