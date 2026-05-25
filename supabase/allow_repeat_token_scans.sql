-- 允許同一場次重複掃描（豆花與配料皆可，例如第二碗）
drop index if exists idx_tokens_session_user_tofu_unique;
drop index if exists idx_tokens_session_user_type_unique;
