import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PanelHome() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <p className="empty">
        <strong>Veri kaynağı bağlı değil.</strong>
      </p>
    );
  }
  const [{ count: teams }, { count: players }, { count: matches }] = await Promise.all([
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.from("players").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="stack">
      <p>
        {teams ?? 0} takım · {players ?? 0} oyuncu · {matches ?? 0} maç
      </p>
      <Link href="/panel/fikstur" className="btn-accent" style={{ display: "grid", placeItems: "center" }}>
        Maç kur
      </Link>
    </div>
  );
}
