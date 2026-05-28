-- Phase 1：LIVE 前景 GPS 軌跡點（與 tokens 分離）
-- 在 Supabase SQL Editor 執行

create table if not exists session_location_samples (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  recorded_at timestamptz not null,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  client_point_id uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists session_location_samples_dedupe
  on session_location_samples (session_id, user_id, client_point_id)
  where client_point_id is not null;

create index if not exists session_location_samples_session_user_time
  on session_location_samples (session_id, user_id, recorded_at);

create index if not exists session_location_samples_created_at
  on session_location_samples (created_at);

alter table session_location_samples enable row level security;

-- MVP：與其他表相同，由 API service role 寫入；勿對外暴露軌跡查詢
create policy "anon_all_session_location_samples"
  on session_location_samples for all to anon using (true) with check (true);

-- 建議定期清理（保留 30 天），可於 SQL Editor 排程或手動執行：
-- delete from session_location_samples
-- where created_at < now() - interval '30 days';
