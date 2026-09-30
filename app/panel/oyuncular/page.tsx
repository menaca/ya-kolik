import { PlayerForm } from "@/components/admin-forms";
import { deletePlayer } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PlayersAdmin({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const supabase = await createClient();
  if (!supabase) {
    return (
      <p className="empty">
        <strong>Veri kaynağı bağlı değil.</strong>
      </p>
    );
  }
  const [{ data: teams }, { data: players }, { data: editing }] = await Promise.all([
    supabase.from("teams").select("id,name").order("name"),
    supabase.from("players").select("id,first_name,last_name,shirt_number,team_id,teams(short_name)").order("last_name"),
    id ? supabase.from("players").select("*").eq("id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="split">
      {(teams ?? []).length === 0 ? (
        <p className="empty">
          <strong>Önce takım ekle.</strong>
        </p>
      ) : (
        <PlayerForm teams={teams ?? []} player={editing ?? undefined} />
      )}
      <div className="admin-list">
        {(players ?? []).map((player) => {
          const team = Array.isArray(player.teams) ? player.teams[0] : player.teams;
          return (
            <div key={player.id} className="side" style={{ minHeight: 52, borderBottom: "1px solid var(--line)" }}>
              <Link href={`/panel/oyuncular?id=${player.id}`}>
                {player.shirt_number ?? "·"} {player.first_name} {player.last_name}
                <span className="meta"> {team?.short_name}</span>
              </Link>
              <form action={deletePlayer.bind(null, player.id)}>
                <button className="btn-ghost" type="submit">Sil</button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
