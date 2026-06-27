-- Market Setup Grader v7.6 cloud paper-live schema
-- Safe to run multiple times in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.scan_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  status text not null default 'saved',
  reason text,
  source text,
  timeframe text,
  universe_label text,
  symbols_count integer not null default 0,
  candidates_count integer not null default 0,
  actionable_count integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  notes text
);

create index if not exists scan_runs_created_at_idx on public.scan_runs (created_at desc);
create index if not exists scan_runs_universe_idx on public.scan_runs (universe_label, created_at desc);

create table if not exists public.scan_signals (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid not null references public.scan_runs(id) on delete cascade,
  created_at timestamptz not null default now(),
  symbol text not null,
  score numeric,
  bias text,
  setup text,
  regime text,
  market_state text,
  rr numeric,
  entry numeric,
  stop numeric,
  target numeric,
  latest_time timestamptz,
  stale_minutes integer,
  actionable boolean not null default false,
  priority numeric,
  reasons jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  raw jsonb not null default '{}'::jsonb
);

create index if not exists scan_signals_run_idx on public.scan_signals (scan_run_id);
create index if not exists scan_signals_symbol_time_idx on public.scan_signals (symbol, latest_time desc);
create index if not exists scan_signals_actionable_idx on public.scan_signals (actionable, created_at desc);

create table if not exists public.paper_trades (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  scan_signal_id uuid references public.scan_signals(id) on delete set null,
  symbol text not null,
  timeframe text,
  bias text,
  signal_time timestamptz,
  entry numeric,
  stop numeric,
  target numeric,
  rr numeric,
  score numeric,
  shares numeric,
  risk_dollars numeric,
  position_value numeric,
  last_price numeric,
  unrealized_pnl numeric,
  status text not null default 'Open',
  close_time timestamptz,
  close_price numeric,
  result_r numeric,
  result_dollars numeric,
  notes text,
  raw jsonb not null default '{}'::jsonb
);

alter table public.paper_trades add column if not exists shares numeric;
alter table public.paper_trades add column if not exists risk_dollars numeric;
alter table public.paper_trades add column if not exists position_value numeric;
alter table public.paper_trades add column if not exists last_price numeric;
alter table public.paper_trades add column if not exists unrealized_pnl numeric;

create index if not exists paper_trades_status_idx on public.paper_trades (status, created_at desc);
create index if not exists paper_trades_symbol_idx on public.paper_trades (symbol, created_at desc);

create table if not exists public.symbol_quality_state (
  symbol text primary key,
  updated_at timestamptz not null default now(),
  enabled boolean not null default true,
  recent_trades integer not null default 0,
  recent_avg_r numeric,
  recent_pf numeric,
  recent_win_rate numeric,
  recent_drawdown_r numeric,
  pause_reason text,
  raw jsonb not null default '{}'::jsonb
);

create table if not exists public.bot_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists bot_events_created_at_idx on public.bot_events (created_at desc);
create index if not exists bot_events_type_idx on public.bot_events (event_type, created_at desc);
