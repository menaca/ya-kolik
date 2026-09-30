export type MatchStatus = "scheduled" | "live" | "ht" | "ft";

export type TeamRef = {
  id: string;
  name: string;
  short_name: string;
  slug: string;
};

export type MatchCard = {
  id: string;
  competition_id: string | null;
  matchweek: number | null;
  kickoff_at: string;
  venue: string | null;
  players_per_side: number;
  half_minutes: number;
  half_count: number;
  status: MatchStatus;
  current_half: number;
  clock_started_at: string | null;
  clock_accumulated_seconds: number;
  clock_running: boolean;
  auto_start: boolean;
  score_source: "events" | "manual";
  home_score: number;
  away_score: number;
  lineup_published_at: string | null;
  competition_name: string | null;
  home: TeamRef;
  away: TeamRef;
};

export type StandingRow = {
  team_id: string;
  name: string;
  short_name: string;
  slug: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
};

export type CompetitionRef = {
  id: string;
  name: string;
  season: string;
};

export type HomeData = {
  server_now: number;
  competition: CompetitionRef | null;
  live: MatchCard[];
  today: MatchCard[];
  recent: MatchCard[];
  standings: StandingRow[];
  featured: { team: TeamRef; next: MatchCard | null } | null;
};

export type LineupPlayer = {
  player_id: string;
  slot_index?: number | null;
  shirt_number: number | null;
  position_code?: string | null;
  name: string;
};

export type LineupSide = {
  team_id: string;
  formation: { rows: number[] };
  starters: LineupPlayer[];
  bench: LineupPlayer[];
};

export type MatchEvent = {
  id: string;
  type: "goal" | "own_goal" | "yellow" | "red" | "sub" | "assist";
  team_id: string;
  player_id: string | null;
  related_player_id: string | null;
  minute: number;
  extra_minute: number | null;
  half: number;
  player_name: string | null;
  related_name: string | null;
};

export type RatingRow = {
  player_id: string;
  rating: number | string;
  is_motm: boolean;
  name: string;
  team_id: string | null;
  shirt_number: number | null;
};

export type MatchPayload = {
  server_now: number;
  match: MatchCard;
  events: MatchEvent[];
  ratings: RatingRow[];
  lineups: { home: LineupSide; away: LineupSide } | null;
  h2h: MatchCard[];
};

export type SquadPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  shirt_number: number | null;
  position: string | null;
  nationality_code: string | null;
  age: number | null;
};

export type TeamPayload = {
  server_now: number;
  team: TeamRef & { city: string | null };
  players: SquadPlayer[];
  next: MatchCard | null;
  recent: MatchCard[];
};

export type PlayerPayload = {
  player: {
    id: string;
    first_name: string;
    last_name: string;
    birth_date: string | null;
    age: number | null;
    nationality_code: string | null;
    position: string | null;
    shirt_number: number | null;
    height_cm: number | null;
    preferred_foot: string | null;
    team: TeamRef | null;
  };
  stats: {
    apps: number;
    goals: number;
    assists: number;
    yellow: number;
    red: number;
    avg_rating: number | string | null;
  };
  recent: {
    match_id: string;
    kickoff_at: string;
    home: TeamRef;
    away: TeamRef;
    home_score: number;
    away_score: number;
    rating: number | string | null;
    goals: number;
  }[];
};

export type TeamListItem = TeamRef & { city: string | null };

export type PlayerOption = {
  id: string;
  first_name: string;
  last_name: string;
  shirt_number: number | null;
  position: string | null;
  team_id: string | null;
};
