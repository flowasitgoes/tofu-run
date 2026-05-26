# going_signups 四欄名冊（Supabase）

專案裡報名資料在表 **`going_signups`**（底線、複數，沒有 `going_sign_ups`）。

| 你要的欄位 | 資料庫欄位 | 說明 |
|-----------|------------|------|
| runner_ID | `runner_id` | 跑者編號 |
| email | `email` | Email |
| line | `line_id` | LINE ID（報名表填的 @id） |
| 暱稱 | `nickname` | 顯示名；若空則依序用 `custom_name`、`runner_name` |

## 建立檢視表（推薦）

1. 打開 [Supabase Dashboard](https://supabase.com/dashboard) → 你的專案 → **SQL Editor**
2. 貼上並執行 [`going_signups_sheet_view.sql`](./going_signups_sheet_view.sql)
3. 左側 **Table Editor** 會多一個 **`going_signups_sheet`**，只有四欄 + `created_at`
4. 點該表 → **Export** 可下載 CSV

## 不建 view、只查一次

在 SQL Editor 執行：

```sql
select
  runner_id,
  email,
  line_id as line,
  coalesce(
    nullif(btrim(nickname), ''),
    nullif(btrim(custom_name), ''),
    nullif(btrim(runner_name), '')
  ) as nickname
from going_signups
where intent = 'join'
order by created_at;
```

## 權限提醒

若已執行 [`going_signups_lockdown_anon.sql`](./going_signups_lockdown_anon.sql)，瀏覽器 **anon key 無法**讀報名表；請用 **SQL Editor（postgres）** 或後端 **service role** 查詢／匯出。
