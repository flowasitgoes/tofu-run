-- 請改執行 allow_repeat_token_scans.sql（豆花與配料皆可重複掃）
drop index if exists idx_tokens_session_user_type_unique;
drop index if exists idx_tokens_session_user_tofu_unique;
