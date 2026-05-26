-- 報名名冊檢視：runner_id、email、LINE、暱稱（四欄，方便 Supabase 瀏覽／匯出 CSV）
-- 資料來源表：going_signups（不是 going_sign_ups）
-- 在 Supabase → SQL Editor 執行本檔後，左側 Table Editor 會出現 going_signups_sheet

create or replace view public.going_signups_sheet
with (security_invoker = true)
as
select
  g.runner_id,
  g.email,
  g.line_id as line,
  coalesce(
    nullif(btrim(g.nickname), ''),
    nullif(btrim(g.custom_name), ''),
    nullif(btrim(g.runner_name), '')
  ) as nickname,
  g.created_at
from public.going_signups g
where g.intent = 'join'
order by g.created_at asc;

comment on view public.going_signups_sheet is
  '想參加報名四欄名冊：runner_id, email, line (LINE ID), nickname (暱稱)';

-- 僅 service role／後台查詢（與 going_signups_lockdown_anon 一致，勿對 anon 開放）
revoke all on public.going_signups_sheet from anon, authenticated;
grant select on public.going_signups_sheet to service_role;
