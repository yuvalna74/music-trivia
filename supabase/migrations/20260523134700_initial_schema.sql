-- gen_random_uuid() is built into Postgres 13+; no extension needed

-- =============================================
-- PROFILES (mirrors auth.users, authed users only)
-- =============================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  spotify_id  text,
  display_name text,
  email       text,
  avatar_url  text,
  is_premium  boolean default false,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- Trigger: auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS: own row full access; public can read display_name + avatar_url
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Public view for leaderboard names
create or replace view public.public_profiles as
  select id, display_name, avatar_url from public.profiles;

-- =============================================
-- SPOTIFY TOKENS (stored by backend service role)
-- =============================================
create table public.user_spotify_tokens (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  access_token      text not null,
  refresh_token     text not null,
  expires_at        timestamptz not null,
  updated_at        timestamptz default now()
);

alter table public.user_spotify_tokens enable row level security;

-- Only backend service role touches this table (no user-facing policies)

-- =============================================
-- SOLO GAMES
-- =============================================
create table public.solo_games (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category      text not null,
  total_score   int not null default 0,
  songs_correct int not null default 0,
  artists_correct int not null default 0,
  played_at     timestamptz default now()
);

alter table public.solo_games enable row level security;

create policy "Users can manage own solo games"
  on public.solo_games for all
  using (auth.uid() = user_id);

-- =============================================
-- ROUND RESULTS
-- =============================================
create table public.round_results (
  id             uuid primary key default gen_random_uuid(),
  solo_game_id   uuid not null references public.solo_games(id) on delete cascade,
  track_id       text not null,
  track_name     text not null,
  artist_name    text not null,
  song_answer    text,
  artist_answer  text,
  song_correct   boolean not null default false,
  artist_correct boolean not null default false,
  points_awarded int not null default 0
);

alter table public.round_results enable row level security;

create policy "Users can manage own round results"
  on public.round_results for all
  using (
    auth.uid() = (
      select user_id from public.solo_games where id = solo_game_id
    )
  );

-- =============================================
-- LEADERBOARD ENTRIES (denormalized)
-- =============================================
create table public.leaderboard_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  category    text not null,
  best_score  int not null default 0,
  achieved_at timestamptz default now(),
  unique (user_id, category)
);

alter table public.leaderboard_entries enable row level security;

-- Public read for leaderboards
create policy "Leaderboard is publicly readable"
  on public.leaderboard_entries for select
  using (true);

-- Only backend service role can write (no user insert policy)

-- =============================================
-- FOLLOWS
-- =============================================
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (follower_id, followee_id)
);

alter table public.follows enable row level security;

create policy "Follows are publicly readable"
  on public.follows for select
  using (true);

create policy "Users can manage own follows"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can delete own follows"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- =============================================
-- MULTIPLAYER SESSIONS
-- =============================================
create table public.multiplayer_sessions (
  id           uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  code         text not null unique,
  status       text not null default 'lobby' check (status in ('lobby', 'active', 'ended')),
  created_at   timestamptz default now(),
  ended_at     timestamptz
);

alter table public.multiplayer_sessions enable row level security;

-- All access via backend service role only (no direct user policies)

-- =============================================
-- MULTIPLAYER TEAMS (anonymous, no profile FK)
-- =============================================
create table public.multiplayer_teams (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.multiplayer_sessions(id) on delete cascade,
  name       text not null,
  score      int not null default 0
);

alter table public.multiplayer_teams enable row level security;

-- All access via backend service role only

-- =============================================
-- SEGMENTATION EVENTS (future monetization hook)
-- =============================================
create table public.segmentation_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  event      text not null,
  metadata   jsonb,
  created_at timestamptz default now()
);

alter table public.segmentation_events enable row level security;

-- Only backend service role can read; insert allowed for tracking
create policy "Segmentation insert only"
  on public.segmentation_events for insert
  with check (true);

-- =============================================
-- INDEXES for performance
-- =============================================
create index on public.solo_games (user_id, played_at desc);
create index on public.leaderboard_entries (category, best_score desc);
create index on public.leaderboard_entries (user_id);
create index on public.follows (followee_id);
create index on public.multiplayer_sessions (code);
create index on public.segmentation_events (user_id, created_at desc);
