"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { istanbulToIso, minuteParts, slugify } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type FormState = { message: string } | null;

function touch(matchId?: string, slug?: string, playerId?: string) {
  updateTag("home");
  updateTag("fixtures");
  updateTag("standings");
  updateTag("live");
  updateTag("teams");
  updateTag("players");
  if (matchId) updateTag(`match-${matchId}`);
  if (slug) updateTag(`team-${slug}`);
  if (playerId) updateTag(`player-${playerId}`);
}

async function adminClient() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.app_metadata?.role !== "admin") {
    return null;
  }
  return supabase;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalInt(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  if (!supabase) return { message: "Veri kaynağı bağlı değil." };
  const { data, error } = await supabase.auth.signInWithPassword({
    email: text(formData, "email"),
    password: String(formData.get("password") ?? ""),
  });
  if (error || !data.user) return { message: "E-posta veya şifre hatalı." };
  if (data.user.app_metadata?.role !== "admin") {
    await supabase.auth.signOut();
    return { message: "Bu hesap yönetici değil." };
  }
  redirect("/panel");
}

export async function logout() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/giris");
}

export async function saveCompetition(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { message: "Oturum gerekli." };
  const name = text(formData, "name");
  const season = text(formData, "season");
  if (!name || !season) return { message: "Lig adı ve sezon gerekli." };
  const primary = formData.get("is_primary") === "on";
  if (primary) {
    await supabase.from("competitions").update({ is_primary: false }).eq("is_primary", true);
  }
  const { error } = await supabase.from("competitions").insert({
    name,
    season,
    is_primary: primary,
  });
  if (error) return { message: "Lig kaydedilemedi." };
  touch();
  redirect("/panel/lig");
}

export async function deleteCompetition(id: string) {
  const supabase = await adminClient();
  if (!supabase) return;
  await supabase.from("competitions").delete().eq("id", id);
  touch();
}

export async function saveTeam(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { message: "Oturum gerekli." };
  const name = text(formData, "name");
  const shortName = text(formData, "short_name");
  const city = text(formData, "city") || null;
  if (!name || !shortName) return { message: "Takım adı ve kısa ad gerekli." };

  const { data: existing } = await supabase.from("teams").select("slug");
  const taken = new Set((existing ?? []).map((team) => team.slug as string));
  let slug = slugify(name);
  let n = 2;
  while (taken.has(slug)) {
    slug = `${slugify(name)}-${n}`;
    n += 1;
  }

  const { data, error } = await supabase
    .from("teams")
    .insert({ name, short_name: shortName, slug, city })
    .select("id")
    .single();
  if (error || !data) return { message: "Takım kaydedilemedi." };

  if (formData.get("featured") === "on") {
    await supabase.from("site_settings").update({ featured_team_id: data.id }).eq("id", 1);
  }
  const competitionId = text(formData, "competition_id");
  if (competitionId) {
    await supabase.from("competition_teams").insert({ competition_id: competitionId, team_id: data.id });
  }
  touch(undefined, slug);
  redirect("/panel/takimlar");
}

export async function setFeaturedTeam(teamId: string) {
  const supabase = await adminClient();
  if (!supabase) return;
  await supabase.from("site_settings").update({ featured_team_id: teamId }).eq("id", 1);
  touch();
}

export async function deleteTeam(id: string) {
  const supabase = await adminClient();
  if (!supabase) return;
  await supabase.from("teams").delete().eq("id", id);
  touch();
}

export async function savePlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { message: "Oturum gerekli." };
  const first = text(formData, "first_name");
  const last = text(formData, "last_name");
  const teamId = text(formData, "team_id");
  if (!first || !last || !teamId) return { message: "Ad, soyad ve takım gerekli." };
  const id = text(formData, "id");
  const row = {
    team_id: teamId,
    first_name: first,
    last_name: last,
    birth_date: text(formData, "birth_date") || null,
    nationality_code: text(formData, "nationality_code") || null,
    position: text(formData, "position") || null,
    shirt_number: optionalInt(formData, "shirt_number"),
    height_cm: optionalInt(formData, "height_cm"),
    preferred_foot: text(formData, "preferred_foot") || null,
    active: formData.get("active") === "on",
  };
  const query = id
    ? supabase.from("players").update(row).eq("id", id)
    : supabase.from("players").insert(row);
  const { error } = await query;
  if (error) return { message: "Oyuncu kaydedilemedi." };
  touch(undefined, undefined, id || undefined);
  redirect("/panel/oyuncular");
}

export async function deletePlayer(id: string) {
  const supabase = await adminClient();
  if (!supabase) return;
  await supabase.from("players").delete().eq("id", id);
  touch(undefined, undefined, id);
}

export async function saveMatch(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { message: "Oturum gerekli." };
  const home = text(formData, "home_team_id");
  const away = text(formData, "away_team_id");
  const kickoff = text(formData, "kickoff_at");
  if (!home || !away || !kickoff) return { message: "İki takım ve saat gerekli." };
  if (home === away) return { message: "İki takım farklı olmalı." };
  const competitionId = text(formData, "competition_id") || null;
  const row = {
    competition_id: competitionId,
    matchweek: optionalInt(formData, "matchweek"),
    home_team_id: home,
    away_team_id: away,
    kickoff_at: istanbulToIso(kickoff),
    venue: text(formData, "venue") || null,
    players_per_side: optionalInt(formData, "players_per_side") ?? 11,
    half_minutes: optionalInt(formData, "half_minutes") ?? 45,
    half_count: 2,
    auto_start: formData.get("auto_start") === "on",
  };
  const { data, error } = await supabase.from("matches").insert(row).select("id").single();
  if (error || !data) return { message: "Maç kaydedilemedi." };
  if (competitionId) {
    await supabase.from("competition_teams").upsert([
      { competition_id: competitionId, team_id: home },
      { competition_id: competitionId, team_id: away },
    ]);
  }
  touch(data.id);
  redirect(`/panel/mac/${data.id}`);
}

export async function saveManualResult(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { message: "Oturum gerekli." };
  const id = text(formData, "match_id");
  const home = optionalInt(formData, "home_score");
  const away = optionalInt(formData, "away_score");
  if (!id || home == null || away == null) return { message: "Skor gerekli." };
  const { error } = await supabase
    .from("matches")
    .update({
      score_source: "manual",
      home_score: home,
      away_score: away,
      status: "ft",
      clock_running: false,
    })
    .eq("id", id);
  if (error) return { message: "Sonuç yazılamadı." };
  touch(id);
  return { message: "Sonuç kaydedildi." };
}

export async function deleteMatch(id: string) {
  const supabase = await adminClient();
  if (!supabase) return;
  await supabase.from("matches").delete().eq("id", id);
  touch(id);
}

async function loadMatch(id: string) {
  const supabase = await adminClient();
  if (!supabase) return null;
  const { data } = await supabase.from("matches").select("*").eq("id", id).single();
  if (!data) return null;
  return { supabase, match: data };
}

export async function startMatch(id: string) {
  const loaded = await loadMatch(id);
  if (!loaded) return;
  const half = loaded.match.status === "ht" ? loaded.match.current_half + 1 : 1;
  await loaded.supabase
    .from("matches")
    .update({
      status: "live",
      current_half: half,
      clock_running: true,
      clock_started_at: new Date().toISOString(),
      clock_accumulated_seconds:
        loaded.match.status === "ht"
          ? loaded.match.clock_accumulated_seconds
          : 0,
    })
    .eq("id", id);
  touch(id);
}

export async function pauseHalf(id: string) {
  const loaded = await loadMatch(id);
  if (!loaded) return;
  const boundary = loaded.match.current_half * loaded.match.half_minutes * 60;
  await loaded.supabase
    .from("matches")
    .update({
      status: "ht",
      clock_running: false,
      clock_started_at: null,
      clock_accumulated_seconds: boundary,
    })
    .eq("id", id);
  touch(id);
}

export async function endMatch(id: string) {
  const loaded = await loadMatch(id);
  if (!loaded) return;
  await loaded.supabase
    .from("matches")
    .update({ status: "ft", clock_running: false })
    .eq("id", id);
  touch(id);
}

export async function addMatchEvent(input: {
  matchId: string;
  type: "goal" | "own_goal" | "yellow" | "red" | "sub";
  teamId: string;
  playerId: string;
  relatedId?: string | null;
}) {
  const loaded = await loadMatch(input.matchId);
  if (!loaded) return { ok: false as const, message: "Oturum gerekli." };
  if (loaded.match.status === "scheduled") {
    return { ok: false as const, message: "Önce maçı başlatın." };
  }
  const parts = minuteParts(loaded.match);
  const { error } = await loaded.supabase.rpc("add_event", {
    mid: input.matchId,
    etype: input.type,
    tid: input.teamId,
    pid: input.playerId,
    related: input.relatedId ?? null,
    minute: parts.minute,
    extra_minute: parts.extra,
    half: parts.half,
  });
  if (error) return { ok: false as const, message: "Olay yazılamadı." };
  touch(input.matchId);
  return { ok: true as const };
}

export async function deleteEvent(matchId: string, eventId: string) {
  const supabase = await adminClient();
  if (!supabase) return;
  await supabase.from("match_events").delete().eq("id", eventId);
  touch(matchId);
}

export async function saveLineup(input: {
  matchId: string;
  teamId: string;
  rows: number[];
  starters: { slot: number; playerId: string }[];
  bench: string[];
  publish: boolean;
}) {
  const supabase = await adminClient();
  if (!supabase) return { ok: false as const, message: "Oturum gerekli." };
  const { error } = await supabase.rpc("save_lineup", {
    mid: input.matchId,
    tid: input.teamId,
    formation: { rows: input.rows },
    starters: input.starters.map((starter) => ({
      slot: starter.slot,
      player_id: starter.playerId,
    })),
    bench: input.bench,
    publish: input.publish,
  });
  if (error) return { ok: false as const, message: "Kadro kaydedilemedi." };
  touch(input.matchId);
  return { ok: true as const };
}

export async function saveRatings(input: {
  matchId: string;
  rows: { playerId: string; rating: number; motm: boolean }[];
}) {
  const supabase = await adminClient();
  if (!supabase) return { ok: false as const, message: "Oturum gerekli." };
  await supabase.from("match_ratings").delete().eq("match_id", input.matchId);
  const motmId = input.rows.find((row) => row.motm)?.playerId ?? null;
  const payload = input.rows
    .filter((row) => row.rating >= 1 && row.rating <= 10)
    .map((row) => ({
      match_id: input.matchId,
      player_id: row.playerId,
      rating: row.rating,
      is_motm: row.playerId === motmId,
    }));
  if (payload.length) {
    const { error } = await supabase.from("match_ratings").insert(payload);
    if (error) return { ok: false as const, message: "Reyting kaydedilemedi." };
  }
  touch(input.matchId);
  return { ok: true as const };
}
