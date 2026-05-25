"use client";

/**
 * 在線心跳（POST /api/live/presence）暫停使用。
 * 恢復時：在此 hook 內每 25s 呼叫 /api/live/presence，並在 LIVE / scan / ground 掛載。
 */
export function useLivePresence(_runnerId: string | null, _enabled = true) {
  /* intentionally no-op */
}
