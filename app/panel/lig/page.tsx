import { CompetitionForm } from "@/components/admin-forms";
import { deleteCompetition } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export default async function LeagueAdmin() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <p className="empty">
        <strong>Veri kaynağı bağlı değil.</strong>
      </p>
    );
  }
  const { data } = await supabase.from("competitions").select("id,name,season,is_primary").order("created_at", { ascending: false });

  return (
    <div className="split">
      <CompetitionForm />
      <div className="admin-list">
        {(data ?? []).map((competition) => (
          <form key={competition.id} action={deleteCompetition.bind(null, competition.id)}>
            <span>
              {competition.name} {competition.season}
              {competition.is_primary ? " · birincil" : ""}
            </span>
            <button className="btn-ghost" type="submit">
              Sil
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
