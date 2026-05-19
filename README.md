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
- `NEXT_PUBLIC_APP_URL`（部署後的網址，QR code 用）

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

在各區域張貼 QR code，連結格式：

```
{APP_URL}/scan/redbean   → 水池區
{APP_URL}/scan/mungbean  → 樹林區
{APP_URL}/scan/peanut    → 城市光廊區
{APP_URL}/scan/tapioca   → 草地區
{APP_URL}/scan/taro      → 捷運出口區
```

現場 LIVE 房間 QR（須輸入 Runner ID 進場）：

```
{APP_URL}/live?from=qr
```

舊版加入頁（可選）：

```
{APP_URL}/join
```

### LIVE 資料庫

在 Supabase 執行 [`supabase/add_live_seen_at.sql`](./supabase/add_live_seen_at.sql)，為 `user_sessions` 新增 `live_seen_at` 欄位（在線綠 ✓ 用）。

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
