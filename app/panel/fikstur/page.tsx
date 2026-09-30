import { MatchForm } from "@/components/admin-forms";
import { deleteMatch } from "@/lib/actions";
import { formatKickoff } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function FixturesAdmin() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <p className="empty">
        <strong>Veri kaynağı bağlı değil.</strong>
      </p>
    );
  }
  const [{ data: teams }, { data: competitions }, { data: matches }] = await Promise.all([
    supabase.from("teams").select("id,name").order("name"),
    supabase.from("competitions").select("id,name,season").order("created_at", { ascending: false }),
    supabase
      .from("matches")
      .select("id,kickoff_at,home_score,away_score,status,home:teams!matches_home_team_id_fkey(short_name),away:teams!matches_away_team_id_fkey(short_name)")
      .order("kickoff_at", { ascending: false }),
  ]);

  return (
    <div className="split">
      {(teams ?? []).length < 2 ? (
        <p className="empty">
          <strong>Maç için iki takım gerekli.</strong>
        </p>
      ) : (
        <MatchForm teams={teams ?? []} competitions={competitions ?? []} />
      )}
      <div className="admin-list">
        {(matches ?? []).map((match) => {
          const home = Array.isArray(match.home) ? match.home[0] : match.home;
          const away = Array.isArray(match.away) ? match.away[0] : match.away;
          return (
            <div key={match.id} className="side" style={{ minHeight: 52, borderBottom: "1px solid var(--line)" }}>
              <Link href={`/panel/mac/${match.id}`}>
                {home?.short_name} {match.home_score}-{match.away_score} {away?.short_name}
                <span className="meta"> · {formatKickoff(match.kickoff_at)} · {match.status}</span>
              </Link>
              <form action={deleteMatch.bind(null, match.id)}>
                <button className="btn-ghost" type="submit">Sil</button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
