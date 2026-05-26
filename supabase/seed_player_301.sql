-- 第 301 名額：攝影／工作人員帳號（Supabase SQL Editor 可單獨執行）
insert into users (slot_no, runner_id, runner_name)
values (301, '311-MPH', 'Photographer')
on conflict (runner_id) do update set
  slot_no = excluded.slot_no,
  runner_name = excluded.runner_name;

-- select slot_no, runner_id, runner_name, claimed_at from users where slot_no = 301;
