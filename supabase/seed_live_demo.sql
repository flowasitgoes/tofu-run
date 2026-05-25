-- 可選：LIVE Ground 演示（請依實際 users.id 調整，或僅手動進 LIVE 測試）
-- 假設 runner_id 已存在於 users 且 going_signups 已報名

-- 建立指定日期場次（演示 5/19 可改 date）
-- insert into sessions (date) values ('2026-05-19') on conflict (date) do nothing;

-- 進場與 token 請透過 App：/live 輸入 DOG-214、BEA-242、RAM-532 後掃 /scan/{token}
