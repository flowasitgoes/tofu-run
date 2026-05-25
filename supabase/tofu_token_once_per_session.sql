-- 已廢止：豆花並非只能掃一次。若曾執行舊版腳本，請執行本檔移除誤加的唯一索引。
-- 配料與豆花皆可重複掃（例如第二碗）。

drop index if exists idx_tokens_session_user_tofu_unique;
drop index if exists idx_tokens_session_user_type_unique;
