-- Market Setup Grader v7.7 autonomous dashboard/admin schema
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

-- v7.7 private admin/autopilot control table
create table if not exists public.bot_control (
  id text primary key default 'main',
  updated_at timestamptz not null default now(),
  bot_enabled boolean not null default true,
  paper_trading_enabled boolean not null default false,
  universe_label text not null default 'Tracked Symbols',
  timeframe text not null default '15Min',
  min_score numeric not null default 80,
  max_score numeric not null default 89,
  min_rr numeric not null default 1,
  max_open_positions integer not null default 4,
  starting_equity numeric not null default 5000,
  risk_pct numeric not null default 1,
  max_position_pct numeric not null default 25,
  max_stale_minutes integer not null default 30,
  allow_stale_simulation boolean not null default false,
  scan_limit integer not null default 120,
  notes text
);

insert into public.bot_control (
  id,
  bot_enabled,
  paper_trading_enabled,
  universe_label,
  timeframe,
  min_score,
  max_score,
  min_rr,
  max_open_positions,
  starting_equity,
  risk_pct,
  max_position_pct,
  max_stale_minutes,
  allow_stale_simulation,
  scan_limit,
  notes
)
values (
  'main',
  true,
  false,
  'Tracked Symbols',
  '15Min',
  80,
  89,
  1,
  4,
  5000,
  1,
  25,
  30,
  false,
  100,
  'v8.7 week-ready tracked-symbol defaults. Paper execution starts disarmed.'
)
on conflict (id) do nothing;

-- v8.2 Alpaca paper broker bridge additions. Safe to run multiple times.
alter table public.paper_trades add column if not exists execution_mode text;
alter table public.paper_trades add column if not exists broker_order_id text;
alter table public.paper_trades add column if not exists broker_client_order_id text;
alter table public.paper_trades add column if not exists broker_status text;
alter table public.paper_trades add column if not exists broker_payload jsonb;

create index if not exists paper_trades_broker_order_idx on public.paper_trades (broker_order_id);
create index if not exists paper_trades_execution_mode_idx on public.paper_trades (execution_mode, created_at desc);

alter table public.bot_control add column if not exists broker_mode text not null default 'Supabase Simulation';
alter table public.bot_control add column if not exists broker_paper_enabled boolean not null default false;

update public.bot_control
set broker_mode = coalesce(broker_mode, 'Supabase Simulation'),
    broker_paper_enabled = coalesce(broker_paper_enabled, false)
where id = 'main';

-- v8.4 live broker readiness additions. Safe to run multiple times.
alter table public.bot_control add column if not exists broker_live_enabled boolean not null default false;

update public.bot_control
set broker_live_enabled = coalesce(broker_live_enabled, false)
where id = 'main';


-- v8.5 admin watchlist editor. Safe to run multiple times.
alter table public.bot_control add column if not exists custom_symbols text;

update public.bot_control
set custom_symbols = coalesce(custom_symbols, '')
where id = 'main';


-- v8.7 tracked-symbol-only control panel. Safe to run multiple times.
update public.bot_control
set universe_label = 'Tracked Symbols',
    scan_limit = case when scan_limit is null or scan_limit <= 0 then 100 else scan_limit end,
    custom_symbols = case when custom_symbols is null or length(trim(custom_symbols)) = 0 then 'AAPL, MSFT, NVDA, AMZN, META, GOOGL, GOOG, AVGO, TSLA, BRK.B, LLY, JPM, V, XOM, UNH, MA, COST, NFLX, WMT, PG, JNJ, HD, ABBV, BAC, KO, PLTR, PM, CRM, ORCL, CVX, CSCO, IBM, WFC, GE, ABT, MCD, LIN, AMD, DIS, MRK, ISRG, NOW, TMO, ACN, GS, INTU, PEP, QCOM, TXN, VZ, BKNG, CAT, RTX, AXP, MS, AMGN, C, SPGI, UBER, LOW, PGR, HON, ETN, BSX, NEE, DHR, BLK, TJX, BA, SCHW, SYK, GILD, ADP, DE, MDT, PANW, COP, LMT, ADI, CB, MMC, UPS, PLD, FI, AMAT, SBUX, BMY, ELV, ANET, MU, LRCX, KLAC, SO, TMUS, ICE, MO, CME, AMT, WM, WELL, CEG, MCO, SHW, EQIX, PH, CI, CDNS, HCA, CRWD, APH, MDLZ, MMM, NKE, MSI, ORLY, TDG, SNPS, AJG, COF, ECL, ZTS, USB, ITW, CVS, EMR, WMB, PYPL, AON, MAR, NOC, CMG, GD, REGN, PNC, FTNT, ROP, TFC, CARR, APD, BK, CSX, FCX, ABNB, NSC, JCI, AZO, AEP, TRV, HLT, TGT, ADSK, URI, SLB, COR, NXPI, RSG, PWR, AFL, GM, MPC, HWM, SRE, PSX, ALL, PCAR, O, OKE, VLO, DHI, GWW, SPG, KMI, FICO, TEL, CPRT, MET, PSA, DFS, AIG, RCL, EW, CCI, MSCI, LHX, AMP, FANG, CMI, KDP, FAST, VST, KMB, KR, KVUE, PAYX, HES, BKR, PRU, PEG, CTVA, ACGL, CTSH, FIS, ODFL, VRSK, EXC, TRGP, YUM, IT, EOG, GEHC, RMD, XEL, GLW, IR, DAL, CHTR, CBOE, EA, LEN, OTIS, MNST, ED, MLM, VMC, MPWR, NUE, DXCM, WAB, IQV, ROK, HPQ, MTB, DD, HIG, GRMN, NDAQ, STZ, AVB, EFX, CBRE, EIX, BRO, FITB, CAH, MCHP, XYL, TSCO, KHC, HPE, DOW, WEC, ANSS, TROW, KEYS, NVR, DTE, FSLR, VLTO, WBD, HAL, HSY, STT, EQR, SYF, GPN, APTV, ADM, PPG, DVN, AWK, WY, WTW, LYB, DOV, WST, BR, CINF, DECK, WDC, ETR, EXR, CHD, TYL, PHM, VTR, AEE, TER, STE, WAT, ZBH, NTAP, RF, PPL, FE, ES, OMC, HUBB, SBAC, MKC, NTRS, CCL, HBAN, LDOS, INVH, GDDY, CNP, CMS, BALL, COO, LULU, DG, LH, LUV, ULTA, J, NDSN, MOH, ESS, PFG, CTAS, TXT, IEX, DPZ, SWKS, STX, AVY, MAS, EG, DRI, HOLX, BBY, CLX, TPR, K, MTCH, CF, TRMB, GEN, AES, PKG, ALLE, JBHT, TSN, ARE, AKAM, IP, EVRG, PTC, WRB, VRSN, SNA, KIM, RL, EPAM, CAG, LKQ, NWSA, UAL, INCY, BAX, FDS, POOL, UDR, ATO, HST, HII, REG, WYNN, NCLH, QRVO, BXP, TAP, BEN, DAY, SJM, FOXA, EMN, MKTX, AOS, CRL, ROL, MHK, FFIV, GNRC, CPB, AIZ, HAS, BWA, ETSY, IVZ, APA, PAYC, CZR, TECH, BIO, CTLT, GL, HSIC, MGM, CMA, MOS, SOLV, FMC, PARA, MRNA, WBA, ENPH, DVA, AAL, XRAY, VFC, NWS, FOX, PNW, ALB, SWK, CE, LW, CTRA, NI, EXPE, FRT, HRL, TFX, NEM, KMX, DOC, MAA, CPT, ZBRA, ALGN, ROST, PFE, JNPR, JBL, WSM, NET, DDOG, SNOW, MDB, TEAM, OKTA, SHOP, SQ, COIN, RBLX, PATH, U, DASH, PINS, TWLO, ZM, DOCU, AFRM, HOOD, SOFI, DKNG, RIVN, LCID, FUBO, CHWY, SE, BABA, JD, BIDU, TSM, ASML, NVO, ARM, SMCI, DELL, INTC, MRVL, ON, CRUS, ALGM, LSCC, RUN, BE, STEM, PLUG, FCEL, BLNK, VRT, TT, X, CLF, AA, SCCO, TECK, GOLD, AEM, FNV, WPM, RIO, BHP, VALE, NTR, BG, GIS' else custom_symbols end,
    notes = coalesce(notes, 'v8.7 admin: tracked symbols list is the cloud bot watchlist.')
where id = 'main';
