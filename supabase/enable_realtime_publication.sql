-- 在 Supabase Dashboard → Database → Replication 勾選以下表，或依專案政策執行：
--   • user_sessions  — LIVE 名單即時更新（第二人進場時第一人立刻看到）
--   • tokens         — 掃 Token Toast、Ground 看板

-- 若使用 SQL 管理 publication（部分方案）：
-- alter publication supabase_realtime add table user_sessions;
-- alter publication supabase_realtime add table tokens;
