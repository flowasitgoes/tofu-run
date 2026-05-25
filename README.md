# 豆花慢跑 Tofu Run

城市輕社交 + 任務式慢跑遊戲 MVP。高雄中央公園活動用。

## 技術棧

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase
- localStorage 玩家登入狀態

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定 Supabase

1. 建立 [Supabase](https://supabase.com) 專案
2. 在 SQL Editor 執行 [`supabase/schema.sql`](./supabase/schema.sql)
3. 複製環境變數：

```bash
cp .env.local.example .env.local
```

填入：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（僅伺服器；報名／護照查詢用，**勿**加 `NEXT_PUBLIC_`）
- `ADMIN_SECRET`（管理者頁面密鑰）
- `NEXT_PUBLIC_SITE_URL`（正式網域，須與 og:image 同網域，例：`https://tofu-run.ifunlove.com`）
- `NEXT_PUBLIC_FB_APP_ID`（可選，Facebook App 數字 ID，輸出 `fb:app_id` meta）

報名表 `going_signups` 建議執行 [`supabase/going_signups_lockdown_anon.sql`](./supabase/going_signups_lockdown_anon.sql)，避免前端用 anon key 直連讀取 Email。

### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

## 頁面路由

| 路徑 | 說明 |
|------|------|
| `/` | 首頁 Landing |
| `/join` | 掃 QR 加入（自動生成玩家 ID / 名稱） |
| `/lobby` | 想參加名單（活動前） |
| `/live` | 活動當日 LIVE 房間（須 Runner ID 進場） |
| `/admin` | 管理者分配豆花 |
| `/scan/[token]` | Checkpoint Token 掃描 |
| `/passport` | 豆花護照 |

## Checkpoint QR Code

**一鍵產生可列印 QR 圖**：部署後開啟 [`/checkpoint-qr.html`](https://tofu-run.ifunlove.com/checkpoint-qr.html)（可改網址、下載 PNG、瀏覽器列印）。本機開發可用 `http://localhost:3000/checkpoint-qr.html` 預覽版面（QR 內容建議仍用正式網域，選手手機才能開）。

在各區域張貼 QR code，連結格式：

```
{SITE_URL}/scan/tofu      → 太陽泉／起點（全員必掃豆花）
{SITE_URL}/scan/redbean   → 水池區
{SITE_URL}/scan/mungbean  → 樹林區
{SITE_URL}/scan/peanut    → 城市光廊區
{SITE_URL}/scan/tapioca   → 草地區
{SITE_URL}/scan/taro      → 捷運出口區
```

現場 LIVE 房間 QR（須輸入 Runner ID 進場）：

```
{SITE_URL}/live?from=qr
```

舊版加入頁（可選）：

```
{SITE_URL}/join
```

### LIVE 資料庫

在 Supabase 執行：

1. [`supabase/add_live_seen_at.sql`](./supabase/add_live_seen_at.sql) — `user_sessions.live_seen_at`（在線綠 ✓）
2. [`supabase/add_tokens_session_id.sql`](./supabase/add_tokens_session_id.sql) — `tokens.session_id` + 同日同種不可重複掃
3. Dashboard → **Database → Replication** — 啟用 **Realtime**：
   - **`user_sessions`** — LIVE 名單有人進場時即時更新
   - **`tokens`** — 掃 Token Toast、Ground 看板（DB 變更）
   - 專案設定中允許 **Broadcast**（Ground 即時亮格用 WebSocket 廣播，不必重拉 API）

LIVE Ground 看板：`{SITE_URL}/live/ground`（公開讀取今日進度；建議投屏）

## 管理者流程

1. 開啟 `/admin`，輸入 `ADMIN_SECRET`
2. 為每位玩家分配一種豆花（不可重複）
3. 活動結束後可「標記完成」

## 資料表

- `users` — 玩家
- `sessions` — 活動場次（以日期區分）
- `user_sessions` — 玩家參加場次 + 豆花類型
- `tokens` — Checkpoint 掃描紀錄
# tofu-run
# tofu-run
# tofu-run
# tofu-run
