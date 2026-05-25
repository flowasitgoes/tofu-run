-- 豆花慢跑 MVP schema
-- 在 Supabase SQL Editor 執行此檔案

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  runner_id text unique not null,
  runner_name text not null,
  slot_no int unique,
  claimed_at timestamptz,
  first_lat double precision,
  first_lng double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_pool_unclaimed
  on users (slot_no)
  where claimed_at is null and slot_no is not null;

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  date date unique not null,
  started_at timestamptz not null default now()
);

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  tofu_type text,
  completed_at timestamptz,
  joined_at timestamptz not null default now(),
  live_seen_at timestamptz,
  unique (user_id, session_id)
);

create table if not exists tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  token_type text not null,
  lat double precision,
  lng double precision,
  scanned_at timestamptz not null default now()
);

create index if not exists idx_user_sessions_session on user_sessions(session_id);
create index if not exists idx_tokens_user on tokens(user_id);
create index if not exists idx_tokens_user_type on tokens(user_id, token_type);
create index if not exists idx_tokens_session on tokens(session_id);
create unique index if not exists idx_tokens_session_user_type_unique
  on tokens(session_id, user_id, token_type)
  where session_id is not null;

-- 首頁「想參加 / 有興趣」預先登記
create table if not exists going_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  runner_id text,
  runner_name text,
  custom_name text,
  nickname text,
  line_id text,
  intent text not null check (intent in ('join', 'interested')),
  topping1 text,
  topping2 text,
  topping3 text,
  goal text,
  preferred_toppings text[] default '{}',
  douhua_goal text,
  created_at timestamptz not null default now()
);

-- 若表已建立，可單獨執行：
-- alter table going_signups add column if not exists line_id text;
-- alter table going_signups add column if not exists preferred_toppings text[] default '{}';
-- alter table going_signups add column if not exists douhua_goal text;
-- alter table going_signups add column if not exists runner_id text;
-- alter table going_signups add column if not exists runner_name text;
-- alter table going_signups add column if not exists custom_name text;
-- alter table going_signups alter column nickname drop not null;
-- alter table going_signups add column if not exists topping1 text;
-- alter table going_signups add column if not exists topping2 text;
-- alter table going_signups add column if not exists topping3 text;
-- alter table going_signups add column if not exists goal text;
-- 既有專案改表名：alter table interest_signups rename to going_signups;

create index if not exists idx_going_signups_created on going_signups(created_at desc);

alter table users enable row level security;
alter table sessions enable row level security;
alter table user_sessions enable row level security;
alter table tokens enable row level security;
alter table going_signups enable row level security;

-- MVP：允許 anon 讀寫（活動用，正式環境請收緊）
create policy "anon_all_users" on users for all to anon using (true) with check (true);
create policy "anon_all_sessions" on sessions for all to anon using (true) with check (true);
create policy "anon_all_user_sessions" on user_sessions for all to anon using (true) with check (true);
create policy "anon_all_tokens" on tokens for all to anon using (true) with check (true);
-- going_signups：僅伺服器 service role 讀寫（見 .env SUPABASE_SERVICE_ROLE_KEY）
-- 勿對 anon 開放 select/insert，避免前端直連洩漏報名資料
