create table datasets (
  id bigint generated always as identity primary key,
  visitor_id text,
  name text not null,
  source text not null,
  license text,
  unit_label text not null,
  day_boundary text not null,
  currency text not null,
  mode text not null check (mode in ('full', 'rule', 'watch', 'no_mode')),
  is_demo boolean not null default false,
  status text not null default 'active' check (status in ('loading', 'active', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index datasets_visitor_idx on datasets (visitor_id, created_at);

create table sales (
  dataset_id bigint not null references datasets (id) on delete cascade,
  store_id text not null,
  product_id text not null,
  day date not null,
  quantity numeric not null,
  empty_flag text not null check (empty_flag in ('yes', 'no', 'unknown')),
  hourly jsonb,
  primary key (dataset_id, store_id, product_id, day)
);

create index sales_dataset_day_idx on sales (dataset_id, day);

create table ops (
  dataset_id bigint not null references datasets (id) on delete cascade,
  store_id text not null,
  product_id text not null,
  stock numeric,
  price numeric,
  lead_time_hours numeric,
  primary key (dataset_id, store_id, product_id)
);

create table routes (
  dataset_id bigint not null references datasets (id) on delete cascade,
  from_store text not null,
  to_store text not null,
  hours numeric not null,
  primary key (dataset_id, from_store, to_store)
);

create table data_quality (
  dataset_id bigint primary key references datasets (id) on delete cascade,
  report jsonb not null
);

create table warnings (
  id bigint generated always as identity primary key,
  dataset_id bigint not null references datasets (id) on delete cascade,
  store_id text not null,
  product_id text not null,
  as_of_day date not null,
  target_day date not null,
  score double precision not null,
  band text,
  rank integer,
  reasons jsonb not null default '[]'::jsonb,
  model_version text not null
);

create unique index warnings_shelf_day_unique
  on warnings (dataset_id, store_id, product_id, as_of_day);

create index warnings_rank_idx on warnings (dataset_id, as_of_day, rank);

create table fixes (
  id bigint generated always as identity primary key,
  warning_id bigint not null references warnings (id) on delete cascade,
  kind text not null check (kind in ('move', 'reorder', 'hold')),
  amount numeric,
  from_store text,
  arrive_at timestamptz,
  cost numeric,
  cover_days numeric,
  assumptions jsonb not null default '[]'::jsonb,
  recommended boolean not null default false
);

create index fixes_warning_idx on fixes (warning_id);

create table decisions (
  id bigint generated always as identity primary key,
  warning_id bigint not null references warnings (id) on delete cascade,
  fix_id bigint references fixes (id),
  visitor_id text,
  action text not null check (action in ('approve', 'reject')),
  snapshot jsonb not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create unique index decisions_one_per_visitor
  on decisions (warning_id, coalesce(visitor_id, 'demo'));

create table outcomes (
  decision_id bigint primary key references decisions (id) on delete cascade,
  simulated_available boolean,
  simulated_lost numeric,
  empty_hours integer,
  notes text
);

create table proof_runs (
  id bigint generated always as identity primary key,
  dataset_id bigint not null references datasets (id) on delete cascade,
  kind text not null check (kind in ('primary', 'upload', 'assistant_check', 'replay')),
  status text not null check (status in ('queued', 'running', 'done', 'failed')),
  progress jsonb,
  scores jsonb,
  losses jsonb,
  split jsonb,
  model_version text,
  policy_version text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index proof_runs_dataset_idx on proof_runs (dataset_id, kind, created_at);

create table assistant_runs (
  id bigint generated always as identity primary key,
  dataset_id bigint not null references datasets (id) on delete cascade,
  visitor_id text,
  question text not null,
  answer text,
  facts jsonb,
  sources jsonb,
  tool_calls jsonb,
  latency_ms integer,
  cost numeric,
  provider text,
  model text,
  validation text,
  check_run_id bigint references proof_runs (id) on delete set null,
  created_at timestamptz not null default now()
);

create index assistant_runs_dataset_idx on assistant_runs (dataset_id, created_at);

create table model_versions (
  id text primary key,
  kind text not null,
  artifact jsonb not null,
  feature_spec jsonb not null,
  trained_cities jsonb,
  test_cities jsonb,
  metrics jsonb,
  created_at timestamptz not null default now()
);
