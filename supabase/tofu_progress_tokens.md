# 豆花六站 Token（tofu-01 … tofu-06）

## 行為

- 路線上的邏輯 Token 仍為 `tofu`（報名目標、護照顯示）。
- 現場掃描寫入 `tokens.token_type` 為 `tofu-01` … `tofu-06`。
- 同一輪內同一站不可重掃；可連續掃不同站（例如 01 再 02）。
- 六站各掃滿一輪 → 計為 1 顆豆花，再與配料次數取最小值得「完成碗數」。

## 資料庫

- `tokens.token_type` 為 `text`，**無需** enum migration。
- 舊資料若為單一 `tofu` 類型，不會自動對應六站；新活動請改用六張 QR。

## QR

列印頁：`/checkpoint-qr.html`（6 站豆花 + 5 配料）。
