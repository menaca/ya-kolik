import { MatchDesk } from "@/components/match-desk";
import { defaultRows } from "@/lib/formations";
import { createClient } from "@/lib/supabase/server";
import type { MatchCard, MatchEvent, PlayerOption } from "@/lib/types";
import { notFound } from "next/navigation";

export default async function MatchAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: match } = await supabase
    .from("matches")
    .select("*, home:teams!matches_home_team_id_fkey(id,name,short_name,slug), away:teams!matches_away_team_id_fkey(id,name,short_name,slug), competition:competitions(name)")
    .eq("id", id)
    .maybeSingle();
  if (!match) notFound();

  const [{ data: players }, { data: events }, { data: squads }, { data: lineups }, { data: ratings }] = await Promise.all([
    supabase
      .from("players")
      .select("id,first_name,last_name,shirt_number,position,team_id")
      .in("team_id", [match.home_team_id, match.away_team_id])
      .eq("active", true)
      .order("shirt_number"),
    supabase
      .from("match_events")
      .select("id,type,team_id,player_id,related_player_id,minute,extra_minute,half,player:players!match_events_player_id_fkey(first_name,last_name), related:players!match_events_related_player_id_fkey(first_name,last_name)")
      .eq("match_id", id)
      .neq("type", "assist")
      .order("created_at"),
    supabase.from("match_squads").select("team_id,formation").eq("match_id", id),
    supabase.from("match_lineups").select("team_id,player_id,role,slot_index").eq("match_id", id),
    supabase.from("match_ratings").select("player_id,rating,is_motm").eq("match_id", id),
  ]);

  const home = one(match.home);
  const away = one(match.away);
  const competition = one(match.competition);
  const card: MatchCard = {
    id: match.id,
    competition_id: match.competition_id,
    matchweek: match.matchweek,
    kickoff_at: match.kickoff_at,
    venue: match.venue,
    players_per_side: match.players_per_side,
    half_minutes: match.half_minutes,
    half_count: match.half_count,
    status: match.status,
    current_half: match.current_half,
    clock_started_at: match.clock_started_at,
    clock_accumulated_seconds: match.clock_accumulated_seconds,
    clock_running: match.clock_running,
    auto_start: match.auto_start,
    score_source: match.score_source,
    home_score: match.home_score,
    away_score: match.away_score,
    lineup_published_at: match.lineup_published_at,
    competition_name: competition?.name ?? null,
    home,
    away,
  };

  const list = (players ?? []) as PlayerOption[];
  const rowsFor = (teamId: string) => {
    const squad = (squads ?? []).find((item) => item.team_id === teamId);
    const formation = squad?.formation as { rows?: number[] } | null;
    return formation?.rows?.length ? formation.rows : defaultRows(match.players_per_side);
  };
  const sideState = (teamId: string) => ({
    rows: rowsFor(teamId),
    starters: (lineups ?? [])
      .filter((item) => item.team_id === teamId && item.role === "starter" && item.slot_index != null)
      .map((item) => ({ slot: item.slot_index as number, playerId: item.player_id as string })),
    bench: (lineups ?? [])
      .filter((item) => item.team_id === teamId && item.role === "bench")
      .map((item) => item.player_id as string),
  });

  const eventRows: MatchEvent[] = (events ?? []).map((event) => {
    const player = one(event.player);
    const related = one(event.related);
    return {
      id: event.id,
      type: event.type,
      team_id: event.team_id,
      player_id: event.player_id,
      related_player_id: event.related_player_id,
      minute: event.minute,
      extra_minute: event.extra_minute,
      half: event.half,
      player_name: player ? `${player.first_name} ${player.last_name}` : null,
      related_name: related ? `${related.first_name} ${related.last_name}` : null,
    };
  });

  return (
    <MatchDesk
      match={card}
      homePlayers={list.filter((player) => player.team_id === match.home_team_id)}
      awayPlayers={list.filter((player) => player.team_id === match.away_team_id)}
      events={eventRows}
      squads={{ home: sideState(match.home_team_id), away: sideState(match.away_team_id) }}
      ratings={(ratings ?? []).map((row) => ({
        playerId: row.player_id,
        rating: Number(row.rating),
        motm: row.is_motm,
      }))}
    />
  );
}

function one<T>(value: T | T[] | null): T {
  if (Array.isArray(value)) return value[0];
  return value as T;
}
