-- LIVE：Token 綁定場次 + 同日同種不可重複掃
-- 執行後請在 Supabase Dashboard → Database → Replication 為 tokens 啟用 Realtime

alter table tokens add column if not exists session_id uuid references sessions(id) on delete cascade;

create index if not exists idx_tokens_session on tokens(session_id);
create index if not exists idx_tokens_session_user on tokens(session_id, user_id);

-- tokens 可重複掃（第二碗等）；勿對 (session_id, user_id, token_type) 加唯一限制
