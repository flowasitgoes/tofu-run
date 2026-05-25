---
name: tofu-run-live
description: >-
  Develop Tofu Run LIVE: checkpoint QR tokens, Supabase Realtime notifications,
  Ground board, and session flow without admin assign when signups already have goals.
---

# 豆花慢跑 LIVE 開發

## 產品決策（ verbatim ）

/admin好像暫時先不用，大家都花都選好了

## 通知：Supabase Realtime（方案 B）

- 護照 `/passport`、LIVE `/live`、Ground `/live/ground` 在客戶端訂閱 `tokens` 表的 **INSERT**。
- 個人：訂閱 `user_id=eq.<當前 userId>` → Toast／動畫「獲得 XX Token」。
- Ground：訂閱當日場次相關的 token 事件（見下方 `session_id`）→ 更新五格進度與活動流。
- 在 Supabase Dashboard → Database → Replication：為 **`tokens`** 與 **`user_sessions`** 啟用 Realtime（LIVE 名單 + Token 通知）。
- 瀏覽器用 `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`（與現有 anon RLS 一致）。

## 暫不依赖 Admin 分配豆花

- 報名資料在 `going_signups`：`topping1/2/3`、`goal`、`preferred_toppings`、`douhua_goal`。
- **進入 LIVE**（`/api/live/enter`）或 **joinSession** 時：若 `user_sessions.tofu_type` 為空，從 signup 寫入代表目標（例如 `topping1` 或 `formatDouhuaGoal` 對應的主路線），勿要求主辦先到 `/admin` 點分配。
- **掃描**（`/api/scan`）：改為檢查「已加入今日 session」+ Token 是否在該跑者的 `collectTargetsFromSignup` 內；**不要**再因 `tofu_type` 為 null 回 403。
- `/admin` 頁面保留程式碼，但 LIVE MVP 流程不依赖它。

## QR 與路由（已有）

- 五種：`/scan/redbean|mungbean|peanut|tapioca|taro`
- 掃碼者用自己的 Runner ID（localStorage）領取自己的 token。

## Ground 頁（待實作）

- 路徑建議：`/live/ground`
- 顯示今日 `user_sessions` 參與者 × 五種 token 是否已取得 + 最近動態。
- 演示用可 seed：DOG-214、BEA-242、RAM-532。

## Schema 建議（Realtime 友善）

- `tokens` 增加 `session_id uuid references sessions(id)`，掃描時一併寫入，Ground 訂閱 `session_id=eq.<今日>`。
- 可選：`(user_id, session_id, token_type)` unique，避免同一天重複掃同一顆。

## 實作順序

1. 放寬 scan + enter 與 signup 同步 `tofu_type`
2. `useTokenRealtime` + 護照 Toast
3. `/live/ground` + API
4. Ground Realtime + demo seed
