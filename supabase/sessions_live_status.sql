-- LIVE 場次開關：admin 開啟／結束活動（一次僅一場 active）
-- 在 Supabase SQL Editor 執行

alter table sessions add column if not exists status text not null default 'closed';
alter table sessions add column if not exists ended_at timestamptz;

alter table sessions drop constraint if exists sessions_status_check;
alter table sessions add constraint sessions_status_check
  check (status in ('active', 'closed'));

-- 既有場次視為已結束
update sessions set status = 'closed' where status is null or status not in ('active', 'closed');

create unique index if not exists idx_sessions_one_active
  on sessions ((true))
  where status = 'active';

create index if not exists idx_sessions_date on sessions (date);

-- 供伺服器 service role 自動補欄位（/api/admin/live 開啟活動時會呼叫）
create or replace function public.ensure_sessions_live_status()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  alter table sessions add column if not exists status text not null default 'closed';
  alter table sessions add column if not exists ended_at timestamptz;
  alter table sessions drop constraint if exists sessions_status_check;
  alter table sessions add constraint sessions_status_check
    check (status in ('active', 'closed'));
  update sessions set status = 'closed'
    where status is null or status not in ('active', 'closed');
  create unique index if not exists idx_sessions_one_active
    on sessions ((true)) where status = 'active';
  create index if not exists idx_sessions_date on sessions (date);
end;
$$;

revoke all on function public.ensure_sessions_live_status() from public;
grant execute on function public.ensure_sessions_live_status() to service_role;
