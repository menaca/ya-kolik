import { TeamForm } from "@/components/admin-forms";
import { deleteTeam, setFeaturedTeam } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function TeamsAdmin() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <p className="empty">
        <strong>Veri kaynağı bağlı değil.</strong>
      </p>
    );
  }
  const [{ data: teams }, { data: competitions }, { data: settings }] = await Promise.all([
    supabase.from("teams").select("id,name,short_name,slug,city").order("name"),
    supabase.from("competitions").select("id,name,season").order("created_at", { ascending: false }),
    supabase.from("site_settings").select("featured_team_id").eq("id", 1).single(),
  ]);

  return (
    <div className="split">
      <TeamForm competitions={competitions ?? []} />
      <div className="admin-list">
        {(teams ?? []).map((team) => (
          <div key={team.id} className="side" style={{ minHeight: 52, borderBottom: "1px solid var(--line)" }}>
            <Link href={`/takim/${team.slug}`}>{team.name}</Link>
            <span className="row-actions">
              {settings?.featured_team_id === team.id ? <span className="meta">Kulüp</span> : (
                <form action={setFeaturedTeam.bind(null, team.id)}>
                  <button className="btn-ghost" type="submit">Kulüp yap</button>
                </form>
              )}
              <form action={deleteTeam.bind(null, team.id)}>
                <button className="btn-ghost" type="submit">Sil</button>
              </form>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
