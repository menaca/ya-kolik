-- Ya-Kolik league schema. Public read, admin write via app_metadata.role.

create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'Ya-Kolik',
  featured_team_id uuid
);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  slug text not null unique,
  city text,
  created_at timestamptz not null default now()
);

alter table public.site_settings
  add constraint site_settings_featured_team_fkey
  foreign key (featured_team_id) references public.teams (id) on delete set null;

create table public.competition_teams (
  competition_id uuid not null references public.competitions (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  primary key (competition_id, team_id)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams (id) on delete restrict,
  first_name text not null,
  last_name text not null,
  birth_date date,
  nationality_code text,
  position text,
  shirt_number integer,
  height_cm integer,
  preferred_foot text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint players_position_check check (position is null or position in ('KL', 'DEF', 'OS', 'FOR')),
  constraint players_foot_check check (preferred_foot is null or preferred_foot in ('sol', 'sag', 'cift')),
  constraint players_nation_check check (nationality_code is null or nationality_code ~ '^[A-Z]{2}$')
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references public.competitions (id) on delete cascade,
  matchweek integer,
  home_team_id uuid not null references public.teams (id) on delete restrict,
  away_team_id uuid not null references public.teams (id) on delete restrict,
  kickoff_at timestamptz not null,
  venue text,
  players_per_side integer not null default 11,
  half_minutes integer not null default 45,
  half_count integer not null default 2,
  status text not null default 'scheduled',
  current_half integer not null default 1,
  clock_started_at timestamptz,
  clock_accumulated_seconds integer not null default 0,
  clock_running boolean not null default false,
  auto_start boolean not null default true,
  score_source text not null default 'events',
  home_score integer not null default 0,
  away_score integer not null default 0,
  lineup_published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint matches_distinct_teams check (home_team_id <> away_team_id),
  constraint matches_side_check check (players_per_side between 5 and 11),
  constraint matches_half_minutes_check check (half_minutes between 5 and 60),
  constraint matches_half_count_check check (half_count between 1 and 4),
  constraint matches_status_check check (status in ('scheduled', 'live', 'ht', 'ft')),
  constraint matches_score_source_check check (score_source in ('events', 'manual')),
  constraint matches_scores_check check (home_score >= 0 and away_score >= 0)
);

create table public.match_squads (
  match_id uuid not null references public.matches (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  formation jsonb not null default '{"rows":[1,4,4,2]}'::jsonb,
  primary key (match_id, team_id)
);

create table public.match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  role text not null,
  slot_index integer,
  position_code text,
  shirt_number integer,
  constraint match_lineups_role_check check (role in ('starter', 'bench')),
  constraint match_lineups_player_once unique (match_id, player_id)
);

create unique index match_lineups_slot_idx
  on public.match_lineups (match_id, team_id, slot_index)
  where role = 'starter' and slot_index is not null;

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  parent_event_id uuid references public.match_events (id) on delete cascade,
  type text not null,
  team_id uuid not null references public.teams (id) on delete restrict,
  player_id uuid references public.players (id) on delete restrict,
  related_player_id uuid references public.players (id) on delete set null,
  minute integer not null,
  extra_minute integer,
  half integer not null default 1,
  created_at timestamptz not null default now(),
  constraint match_events_type_check check (type in ('goal', 'own_goal', 'assist', 'yellow', 'red', 'sub')),
  constraint match_events_minute_check check (minute >= 0 and minute <= 200)
);

create table public.match_ratings (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  rating numeric(3,1) not null,
  is_motm boolean not null default false,
  primary key (match_id, player_id),
  constraint match_ratings_range_check check (rating >= 1 and rating <= 10)
);

create unique index match_ratings_one_motm
  on public.match_ratings (match_id)
  where is_motm;

create index matches_kickoff_idx on public.matches (kickoff_at);
create index matches_status_idx on public.matches (status);
create index matches_competition_idx on public.matches (competition_id);
create index matches_home_idx on public.matches (home_team_id);
create index matches_away_idx on public.matches (away_team_id);
create index players_team_idx on public.players (team_id);
create index events_match_idx on public.match_events (match_id);
create index lineups_match_idx on public.match_lineups (match_id);

insert into public.site_settings (id, site_name) values (1, 'Ya-Kolik');

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.apply_event_score()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  mid uuid;
begin
  mid := coalesce(new.match_id, old.match_id);
  update public.matches m
  set home_score = (
        select count(*)::integer
        from public.match_events e
        where e.match_id = m.id
          and e.team_id = m.home_team_id
          and e.type in ('goal', 'own_goal')
      ),
      away_score = (
        select count(*)::integer
        from public.match_events e
        where e.match_id = m.id
          and e.team_id = m.away_team_id
          and e.type in ('goal', 'own_goal')
      )
  where m.id = mid
    and m.score_source = 'events';
  return null;
end;
$$;

create trigger match_events_score
after insert or update or delete on public.match_events
for each row execute function public.apply_event_score();

create or replace function public.sync_match_clocks()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.matches
  set status = 'live',
      clock_running = true,
      clock_started_at = kickoff_at,
      clock_accumulated_seconds = 0,
      current_half = 1
  where status = 'scheduled'
    and auto_start
    and kickoff_at <= now();

  update public.matches
  set status = 'ht',
      clock_running = false,
      clock_accumulated_seconds = current_half * half_minutes * 60,
      clock_started_at = null
  where status = 'live'
    and clock_running
    and current_half < half_count
    and clock_started_at is not null
    and clock_accumulated_seconds
        + extract(epoch from (now() - clock_started_at))
        >= current_half * half_minutes * 60;
end;
$$;

revoke all on function public.sync_match_clocks() from public, anon, authenticated;
grant execute on function public.sync_match_clocks() to service_role;

create or replace view public.match_cards
with (security_invoker = true) as
select
  m.id,
  m.competition_id,
  m.matchweek,
  m.kickoff_at,
  m.venue,
  m.players_per_side,
  m.half_minutes,
  m.half_count,
  m.status,
  m.current_half,
  m.clock_started_at,
  m.clock_accumulated_seconds,
  m.clock_running,
  m.auto_start,
  m.score_source,
  m.home_score,
  m.away_score,
  m.lineup_published_at,
  c.name as competition_name,
  jsonb_build_object(
    'id', ht.id,
    'name', ht.name,
    'short_name', ht.short_name,
    'slug', ht.slug
  ) as home,
  jsonb_build_object(
    'id', at.id,
    'name', at.name,
    'short_name', at.short_name,
    'slug', at.slug
  ) as away
from public.matches m
join public.teams ht on ht.id = m.home_team_id
join public.teams at on at.id = m.away_team_id
left join public.competitions c on c.id = m.competition_id;

create or replace function public.standings_json(comp uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with members as (
    select t.id, t.name, t.short_name, t.slug
    from public.competition_teams ct
    join public.teams t on t.id = ct.team_id
    where ct.competition_id = comp
    union
    select t.id, t.name, t.short_name, t.slug
    from public.matches m
    join public.teams t on t.id = m.home_team_id
    where m.competition_id = comp
    union
    select t.id, t.name, t.short_name, t.slug
    from public.matches m
    join public.teams t on t.id = m.away_team_id
    where m.competition_id = comp
  ),
  played as (
    select home_team_id as team_id, home_score as gf, away_score as ga
    from public.matches
    where competition_id = comp and status = 'ft'
    union all
    select away_team_id, away_score, home_score
    from public.matches
    where competition_id = comp and status = 'ft'
  )
  select case
    when comp is null then '[]'::jsonb
    else coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'team_id', s.id,
          'name', s.name,
          'short_name', s.short_name,
          'slug', s.slug,
          'played', s.played,
          'won', s.won,
          'drawn', s.drawn,
          'lost', s.lost,
          'goals_for', s.goals_for,
          'goals_against', s.goals_against,
          'goal_diff', s.goal_diff,
          'points', s.points
        )
        order by s.points desc, s.goal_diff desc, s.goals_for desc, s.name
      )
      from (
        select
          mb.id,
          mb.name,
          mb.short_name,
          mb.slug,
          count(p.team_id)::int as played,
          count(p.team_id) filter (where p.gf > p.ga)::int as won,
          count(p.team_id) filter (where p.gf = p.ga)::int as drawn,
          count(p.team_id) filter (where p.gf < p.ga)::int as lost,
          coalesce(sum(p.gf), 0)::int as goals_for,
          coalesce(sum(p.ga), 0)::int as goals_against,
          (coalesce(sum(p.gf), 0) - coalesce(sum(p.ga), 0))::int as goal_diff,
          (
            count(p.team_id) filter (where p.gf > p.ga) * 3
            + count(p.team_id) filter (where p.gf = p.ga)
          )::int as points
        from members mb
        left join played p on p.team_id = mb.id
        group by mb.id, mb.name, mb.short_name, mb.slug
      ) s
    ), '[]'::jsonb)
  end;
$$;

create or replace function public.primary_competition_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select id
  from public.competitions
  order by is_primary desc, created_at desc
  limit 1;
$$;

create or replace function public.get_home()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'server_now', (extract(epoch from now()) * 1000)::bigint,
    'competition', (
      select jsonb_build_object('id', c.id, 'name', c.name, 'season', c.season)
      from public.competitions c
      where c.id = public.primary_competition_id()
    ),
    'live', coalesce((
      select jsonb_agg(to_jsonb(mc) order by mc.kickoff_at)
      from public.match_cards mc
      where mc.status in ('live', 'ht')
    ), '[]'::jsonb),
    'today', coalesce((
      select jsonb_agg(to_jsonb(mc) order by mc.kickoff_at)
      from public.match_cards mc
      where (mc.kickoff_at at time zone 'Europe/Istanbul')::date
            = (now() at time zone 'Europe/Istanbul')::date
        and mc.status not in ('live', 'ht')
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(to_jsonb(mc) order by mc.kickoff_at desc)
      from (
        select *
        from public.match_cards
        where status = 'ft'
        order by kickoff_at desc
        limit 8
      ) mc
    ), '[]'::jsonb),
    'standings', public.standings_json(public.primary_competition_id()),
    'featured', (
      select jsonb_build_object(
        'team', jsonb_build_object(
          'id', t.id, 'name', t.name, 'short_name', t.short_name, 'slug', t.slug
        ),
        'next', (
          select to_jsonb(mc)
          from public.match_cards mc
          where mc.status in ('scheduled', 'live', 'ht')
            and (
              mc.home->>'id' = t.id::text
              or mc.away->>'id' = t.id::text
            )
          order by mc.kickoff_at
          limit 1
        )
      )
      from public.site_settings s
      join public.teams t on t.id = s.featured_team_id
      where s.id = 1
    )
  );
$$;

create or replace function public.get_fixtures()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'server_now', (extract(epoch from now()) * 1000)::bigint,
    'matches', coalesce((
      select jsonb_agg(to_jsonb(mc) order by mc.kickoff_at)
      from public.match_cards mc
    ), '[]'::jsonb)
  );
$$;

create or replace function public.get_standings()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'competition', (
      select jsonb_build_object('id', c.id, 'name', c.name, 'season', c.season)
      from public.competitions c
      where c.id = public.primary_competition_id()
    ),
    'rows', public.standings_json(public.primary_competition_id())
  );
$$;

create or replace function public.get_teams()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'short_name', t.short_name,
        'slug', t.slug,
        'city', t.city
      )
      order by t.name
    )
    from public.teams t
  ), '[]'::jsonb);
$$;

create or replace function public.lineup_side(mid uuid, tid uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'team_id', tid,
    'formation', coalesce((
      select formation
      from public.match_squads
      where match_id = mid and team_id = tid
    ), '{"rows":[1,4,4,2]}'::jsonb),
    'starters', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'player_id', l.player_id,
          'slot_index', l.slot_index,
          'shirt_number', coalesce(l.shirt_number, p.shirt_number),
          'position_code', coalesce(l.position_code, p.position),
          'name', trim(both from p.first_name || ' ' || p.last_name)
        )
        order by l.slot_index
      )
      from public.match_lineups l
      join public.players p on p.id = l.player_id
      where l.match_id = mid and l.team_id = tid and l.role = 'starter'
    ), '[]'::jsonb),
    'bench', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'player_id', l.player_id,
          'shirt_number', coalesce(l.shirt_number, p.shirt_number),
          'name', trim(both from p.first_name || ' ' || p.last_name)
        )
        order by p.shirt_number nulls last, p.last_name
      )
      from public.match_lineups l
      join public.players p on p.id = l.player_id
      where l.match_id = mid and l.team_id = tid and l.role = 'bench'
    ), '[]'::jsonb)
  );
$$;

create or replace function public.get_match(mid uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  card jsonb;
  published timestamptz;
begin
  select to_jsonb(mc), mc.lineup_published_at
  into card, published
  from public.match_cards mc
  where mc.id = mid;

  if card is null then
    return null;
  end if;

  return jsonb_build_object(
    'server_now', (extract(epoch from now()) * 1000)::bigint,
    'match', card,
    'events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'type', e.type,
          'team_id', e.team_id,
          'player_id', e.player_id,
          'related_player_id', e.related_player_id,
          'minute', e.minute,
          'extra_minute', e.extra_minute,
          'half', e.half,
          'player_name', nullif(trim(both from concat_ws(' ', p.first_name, p.last_name)), ''),
          'related_name', nullif(trim(both from concat_ws(' ', r.first_name, r.last_name)), '')
        )
        order by e.half, e.minute, e.extra_minute nulls first, e.created_at
      )
      from public.match_events e
      left join public.players p on p.id = e.player_id
      left join public.players r on r.id = e.related_player_id
      where e.match_id = mid
        and e.type <> 'assist'
    ), '[]'::jsonb),
    'ratings', case
      when card->>'status' = 'ft' then coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'player_id', rt.player_id,
            'rating', rt.rating,
            'is_motm', rt.is_motm,
            'name', trim(both from p.first_name || ' ' || p.last_name),
            'team_id', p.team_id,
            'shirt_number', p.shirt_number
          )
          order by rt.is_motm desc, rt.rating desc, p.last_name
        )
        from public.match_ratings rt
        join public.players p on p.id = rt.player_id
        where rt.match_id = mid
      ), '[]'::jsonb)
      else '[]'::jsonb
    end,
    'lineups', case
      when published is null then null
      else jsonb_build_object(
        'home', public.lineup_side(mid, (card->'home'->>'id')::uuid),
        'away', public.lineup_side(mid, (card->'away'->>'id')::uuid)
      )
    end,
    'h2h', coalesce((
      select jsonb_agg(to_jsonb(h) order by h.kickoff_at desc)
      from (
        select *
        from public.match_cards mc
        where mc.status = 'ft'
          and mc.id <> mid
          and (
            (mc.home->>'id' = card->'home'->>'id' and mc.away->>'id' = card->'away'->>'id')
            or (mc.home->>'id' = card->'away'->>'id' and mc.away->>'id' = card->'home'->>'id')
          )
        order by mc.kickoff_at desc
        limit 5
      ) h
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_team(team_slug text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  tid uuid;
  payload jsonb;
begin
  select t.id into tid from public.teams t where t.slug = team_slug;
  if tid is null then
    return null;
  end if;

  select jsonb_build_object(
    'server_now', (extract(epoch from now()) * 1000)::bigint,
    'team', (
      select jsonb_build_object(
        'id', t.id, 'name', t.name, 'short_name', t.short_name, 'slug', t.slug, 'city', t.city
      )
      from public.teams t where t.id = tid
    ),
    'players', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'shirt_number', p.shirt_number,
          'position', p.position,
          'nationality_code', p.nationality_code,
          'age', case when p.birth_date is null then null else extract(year from age(p.birth_date))::int end
        )
        order by p.shirt_number nulls last, p.last_name
      )
      from public.players p
      where p.team_id = tid and p.active
    ), '[]'::jsonb),
    'next', (
      select to_jsonb(mc)
      from public.match_cards mc
      where mc.status in ('scheduled', 'live', 'ht')
        and (mc.home->>'id' = tid::text or mc.away->>'id' = tid::text)
      order by mc.kickoff_at
      limit 1
    ),
    'recent', coalesce((
      select jsonb_agg(to_jsonb(mc) order by mc.kickoff_at desc)
      from (
        select *
        from public.match_cards
        where status = 'ft'
          and (home->>'id' = tid::text or away->>'id' = tid::text)
        order by kickoff_at desc
        limit 5
      ) mc
    ), '[]'::jsonb)
  ) into payload;

  return payload;
end;
$$;

create or replace function public.get_player(pid uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select case when p.id is null then null else jsonb_build_object(
    'player', jsonb_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'birth_date', p.birth_date,
      'age', case when p.birth_date is null then null else extract(year from age(p.birth_date))::int end,
      'nationality_code', p.nationality_code,
      'position', p.position,
      'shirt_number', p.shirt_number,
      'height_cm', p.height_cm,
      'preferred_foot', p.preferred_foot,
      'team', case when t.id is null then null else jsonb_build_object(
        'id', t.id, 'name', t.name, 'short_name', t.short_name, 'slug', t.slug
      ) end
    ),
    'stats', jsonb_build_object(
      'apps', (
        select count(distinct x.match_id)::int
        from (
          select l.match_id
          from public.match_lineups l
          where l.player_id = p.id and l.role = 'starter'
          union
          select e.match_id
          from public.match_events e
          where e.player_id = p.id or e.related_player_id = p.id
        ) x
      ),
      'goals', (
        select count(*)::int from public.match_events e
        where e.player_id = p.id and e.type = 'goal'
      ),
      'assists', (
        select count(*)::int from public.match_events e
        where e.player_id = p.id and e.type = 'assist'
      ),
      'yellow', (
        select count(*)::int from public.match_events e
        where e.player_id = p.id and e.type = 'yellow'
      ),
      'red', (
        select count(*)::int from public.match_events e
        where e.player_id = p.id and e.type = 'red'
      ),
      'avg_rating', (
        select round(avg(rt.rating), 1)
        from public.match_ratings rt
        where rt.player_id = p.id
      )
    ),
    'recent', coalesce((
      select jsonb_agg(item order by item->>'kickoff_at' desc)
      from (
        select jsonb_build_object(
          'match_id', mc.id,
          'kickoff_at', mc.kickoff_at,
          'home', mc.home,
          'away', mc.away,
          'home_score', mc.home_score,
          'away_score', mc.away_score,
          'rating', rt.rating,
          'goals', (
            select count(*)::int from public.match_events e
            where e.match_id = mc.id and e.player_id = p.id and e.type = 'goal'
          )
        ) as item
        from public.matches m
        join public.match_cards mc on mc.id = m.id
        left join public.match_ratings rt on rt.match_id = m.id and rt.player_id = p.id
        where m.status = 'ft'
          and (
            exists (
              select 1 from public.match_lineups l
              where l.match_id = m.id and l.player_id = p.id
            )
            or exists (
              select 1 from public.match_events e
              where e.match_id = m.id
                and (e.player_id = p.id or e.related_player_id = p.id)
            )
            or rt.player_id is not null
          )
        order by m.kickoff_at desc
        limit 8
      ) rows
    ), '[]'::jsonb)
  ) end
  from public.players p
  left join public.teams t on t.id = p.team_id
  where p.id = pid;
$$;

create or replace function public.save_lineup(
  mid uuid,
  tid uuid,
  formation jsonb,
  starters jsonb,
  bench jsonb,
  publish boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'yetkisiz';
  end if;

  insert into public.match_squads (match_id, team_id, formation)
  values (mid, tid, formation)
  on conflict (match_id, team_id) do update set formation = excluded.formation;

  delete from public.match_lineups where match_id = mid and team_id = tid;

  insert into public.match_lineups (match_id, team_id, player_id, role, slot_index)
  select mid, tid, (item->>'player_id')::uuid, 'starter', (item->>'slot')::int
  from jsonb_array_elements(starters) item
  where coalesce(item->>'player_id', '') <> '';

  insert into public.match_lineups (match_id, team_id, player_id, role)
  select mid, tid, value::uuid, 'bench'
  from jsonb_array_elements_text(bench);

  if publish then
    update public.matches
    set lineup_published_at = coalesce(lineup_published_at, now())
    where id = mid;
  end if;
end;
$$;

create or replace function public.add_event(
  mid uuid,
  etype text,
  tid uuid,
  pid uuid,
  related uuid,
  minute integer,
  extra_minute integer,
  half integer
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  goal_id uuid;
  st text;
begin
  if not public.is_admin() then
    raise exception 'yetkisiz';
  end if;

  select status into st from public.matches where id = mid;
  if st is null then
    raise exception 'maç yok';
  end if;
  if st = 'scheduled' then
    raise exception 'maç başlamadı';
  end if;
  if etype not in ('goal', 'own_goal', 'yellow', 'red', 'sub') then
    raise exception 'olay tipi';
  end if;

  update public.matches set score_source = 'events' where id = mid and etype in ('goal', 'own_goal');

  insert into public.match_events (match_id, type, team_id, player_id, related_player_id, minute, extra_minute, half)
  values (mid, etype, tid, pid, case when etype = 'sub' then related else null end, minute, extra_minute, half)
  returning id into goal_id;

  if etype = 'goal' and related is not null then
    insert into public.match_events (match_id, parent_event_id, type, team_id, player_id, minute, extra_minute, half)
    values (mid, goal_id, 'assist', tid, related, minute, extra_minute, half);
  end if;
end;
$$;

revoke all on function public.save_lineup(uuid, uuid, jsonb, jsonb, jsonb, boolean) from public, anon;
grant execute on function public.save_lineup(uuid, uuid, jsonb, jsonb, jsonb, boolean) to authenticated;

revoke all on function public.add_event(uuid, text, uuid, uuid, uuid, integer, integer, integer) from public, anon;
grant execute on function public.add_event(uuid, text, uuid, uuid, uuid, integer, integer, integer) to authenticated;

grant execute on function public.get_home() to anon, authenticated;
grant execute on function public.get_fixtures() to anon, authenticated;
grant execute on function public.get_standings() to anon, authenticated;
grant execute on function public.get_teams() to anon, authenticated;
grant execute on function public.get_match(uuid) to anon, authenticated;
grant execute on function public.get_team(text) to anon, authenticated;
grant execute on function public.get_player(uuid) to anon, authenticated;
grant execute on function public.standings_json(uuid) to anon, authenticated;
grant execute on function public.lineup_side(uuid, uuid) to anon, authenticated;
grant execute on function public.primary_competition_id() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.site_settings enable row level security;
alter table public.competitions enable row level security;
alter table public.teams enable row level security;
alter table public.competition_teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_squads enable row level security;
alter table public.match_lineups enable row level security;
alter table public.match_events enable row level security;
alter table public.match_ratings enable row level security;

alter table public.site_settings force row level security;
alter table public.competitions force row level security;
alter table public.teams force row level security;
alter table public.competition_teams force row level security;
alter table public.players force row level security;
alter table public.matches force row level security;
alter table public.match_squads force row level security;
alter table public.match_lineups force row level security;
alter table public.match_events force row level security;
alter table public.match_ratings force row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'site_settings', 'competitions', 'teams', 'competition_teams', 'players',
    'matches', 'match_squads', 'match_lineups', 'match_events', 'match_ratings'
  ]
  loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', tbl || '_read', tbl);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      tbl || '_write',
      tbl
    );
  end loop;
end;
$$;

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_events;
alter publication supabase_realtime add table public.match_ratings;
