-- ============================================================
-- Moves social network analytics (Dashboard > Social network analytics)
-- from a live API call on every page load to a periodic background sync
-- that stores daily snapshots -- needed for TikTok (whose Display API
-- only ever returns the account's CURRENT cumulative totals, with no
-- day-bucketed history edge like Facebook/Instagram/YouTube have), and
-- generally cheaper/faster/more resilient to platform rate limits for
-- every platform.
--
-- social_insights_daily holds one row per (social_account, calendar day).
-- `metrics` is a jsonb bag of whichever of app.py's
-- _SOCIAL_INSIGHTS_METRIC_KEYS this platform's own API provides for that
-- day (Facebook/Instagram use impressions/reach/engagement/comments/
-- followers; YouTube uses views/watch_time_minutes/subscribers_gained/
-- subscribers_lost/likes/comments/followers) -- a jsonb bag rather than
-- fixed columns because the metric SET genuinely differs per platform,
-- not just its values. For Facebook/Instagram/YouTube these are real
-- day-bucketed values straight from each platform's own insights API.
-- For TikTok, the sync job computes them as the delta between today's
-- and the last-tracked-day's row in social_insights_cumulative_
-- snapshots (see below) -- TikTok has no other way to get a "this day"
-- figure, only an account-wide running total.
--
-- social_insights_cumulative_snapshots is an append-only log of each
-- sync's raw account-wide cumulative totals, kept ONLY for platforms
-- whose API doesn't already give day-bucketed data (TikTok today). It
-- is what the sync job diffs against the previous day's snapshot to
-- produce that day's social_insights_daily row; nothing else reads it.
-- ============================================================

create table if not exists public.social_insights_daily (
    id                uuid primary key default gen_random_uuid(),
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    social_account_id uuid not null references public.social_accounts(id) on delete cascade,
    user_id           uuid not null references auth.users(id) on delete cascade,
    platform          text not null,
    day               date not null,
    metrics           jsonb not null default '{}'::jsonb,
    constraint social_insights_daily_account_day_key unique (social_account_id, day)
);

create index if not exists idx_social_insights_daily_account_day
    on public.social_insights_daily(social_account_id, day desc);

create table if not exists public.social_insights_cumulative_snapshots (
    id                uuid primary key default gen_random_uuid(),
    created_at        timestamptz not null default now(),
    social_account_id uuid not null references public.social_accounts(id) on delete cascade,
    captured_at       timestamptz not null default now(),
    cumulative        jsonb not null
);

create index if not exists idx_social_insights_cumulative_account_time
    on public.social_insights_cumulative_snapshots(social_account_id, captured_at desc);

alter table public.social_accounts
    add column if not exists last_insights_synced_at timestamptz;

create or replace function public.set_social_insights_daily_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_social_insights_daily_updated_at on public.social_insights_daily;
create trigger trg_social_insights_daily_updated_at
before update on public.social_insights_daily
for each row execute function public.set_social_insights_daily_updated_at();

alter table public.social_insights_daily enable row level security;
alter table public.social_insights_cumulative_snapshots enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'social_insights_daily' and policyname = 'social_insights_daily_select_own'
  ) then
    create policy social_insights_daily_select_own on public.social_insights_daily
      for select using (auth.uid() = user_id);
  end if;
end $$;
