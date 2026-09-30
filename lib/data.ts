import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  HomeData,
  MatchCard,
  MatchPayload,
  PlayerPayload,
  StandingRow,
  TeamListItem,
  TeamPayload,
} from "@/lib/types";

const life = { stale: 30, revalidate: 30, expire: 300 };

const emptyHome = (): HomeData => ({
  server_now: 0,
  competition: null,
  live: [],
  today: [],
  recent: [],
  standings: [],
  featured: null,
});

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return null;
  return data as T;
}

export async function getHome(): Promise<HomeData> {
  "use cache";
  cacheLife(life);
  cacheTag("home", "fixtures", "standings", "live", "teams");
  return (await rpc<HomeData>("get_home")) ?? emptyHome();
}

export async function getFixtures(): Promise<{ server_now: number; matches: MatchCard[] }> {
  "use cache";
  cacheLife(life);
  cacheTag("fixtures");
  return (await rpc("get_fixtures")) ?? { server_now: 0, matches: [] };
}

export async function getStandings(): Promise<{
  competition: HomeData["competition"];
  rows: StandingRow[];
}> {
  "use cache";
  cacheLife(life);
  cacheTag("standings");
  return (await rpc("get_standings")) ?? { competition: null, rows: [] };
}

export async function getTeamList(): Promise<TeamListItem[]> {
  "use cache";
  cacheLife(life);
  cacheTag("teams");
  return (await rpc<TeamListItem[]>("get_teams")) ?? [];
}

export async function getTeam(slug: string): Promise<TeamPayload | null> {
  "use cache";
  cacheLife(life);
  cacheTag("teams", "players", `team-${slug}`);
  return rpc<TeamPayload>("get_team", { team_slug: slug });
}

export async function getPlayer(id: string): Promise<PlayerPayload | null> {
  "use cache";
  cacheLife(life);
  cacheTag("players", `player-${id}`);
  return rpc<PlayerPayload>("get_player", { pid: id });
}

export async function getMatch(id: string): Promise<MatchPayload | null> {
  "use cache";
  cacheLife(life);
  cacheTag("fixtures", "live", `match-${id}`);
  return rpc<MatchPayload>("get_match", { mid: id });
}
