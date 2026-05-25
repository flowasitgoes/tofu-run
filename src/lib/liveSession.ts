import { getTodayDateString } from "@/lib/session";
import type { LiveParticipant } from "@/types/database";

const RUNNER_KEY = "tofu-run-live-runner";
const ROOM_KEY = "tofu-run-live-room";
const RETURN_SCAN_KEY = "tofu-run-return-from-scan";
const PENDING_TOKEN_TOAST_KEY = "tofu-run-pending-token-toast";

/** 從掃描頁回 LIVE 後，短時間內略過 focus 全量刷新 */
const RETURN_SCAN_GRACE_MS = 10_000;

export type LiveRoomCache = {
  runnerId: string;
  sessionDate: string;
  sessionDateLabel: string;
  sessionId: string;
  count: number;
  onlineCount: number;
  participants: LiveParticipant[];
  cachedAt: number;
};

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function getStoredLiveRunnerId(): string | null {
  try {
    const raw = storage()?.getItem(RUNNER_KEY);
    if (!raw) return null;
    const { runnerId, sessionDate } = JSON.parse(raw) as {
      runnerId: string;
      sessionDate: string;
    };
    if (sessionDate !== getTodayDateString()) return null;
    return runnerId;
  } catch {
    return null;
  }
}

export function setStoredLiveRunnerId(runnerId: string): void {
  storage()?.setItem(
    RUNNER_KEY,
    JSON.stringify({ runnerId, sessionDate: getTodayDateString() })
  );
}

export function clearStoredLiveSession(): void {
  storage()?.removeItem(RUNNER_KEY);
  storage()?.removeItem(ROOM_KEY);
}

export function getLiveRoomCache(runnerId: string): LiveRoomCache | null {
  try {
    const raw = storage()?.getItem(ROOM_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as LiveRoomCache;
    if (entry.runnerId !== runnerId) return null;
    if (entry.sessionDate !== getTodayDateString()) return null;
    return entry;
  } catch {
    return null;
  }
}

export function setLiveRoomCache(
  data: Omit<LiveRoomCache, "cachedAt" | "runnerId"> & { runnerId: string }
): void {
  const entry: LiveRoomCache = { ...data, cachedAt: Date.now() };
  storage()?.setItem(ROOM_KEY, JSON.stringify(entry));
}

/** 掃描成功、即將回 LIVE：標記剛從掃描返回，避免進場畫面閃爍與立即重打 API */
export function markReturnFromScan(tokenType: string): void {
  const s = storage();
  if (!s) return;
  s.setItem(RETURN_SCAN_KEY, String(Date.now()));
  s.setItem(
    PENDING_TOKEN_TOAST_KEY,
    JSON.stringify({ tokenType, at: Date.now() })
  );
}

export function shouldDeferLiveRefetch(): boolean {
  try {
    const raw = storage()?.getItem(RETURN_SCAN_KEY);
    if (!raw) return false;
    const age = Date.now() - Number(raw);
    if (age > RETURN_SCAN_GRACE_MS) {
      storage()?.removeItem(RETURN_SCAN_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearReturnFromScan(): void {
  storage()?.removeItem(RETURN_SCAN_KEY);
}

/** 回 LIVE 時顯示剛掃到的 Token 提示（只取一次） */
export function consumePendingTokenToast(): string | null {
  try {
    const raw = storage()?.getItem(PENDING_TOKEN_TOAST_KEY);
    if (!raw) return null;
    storage()?.removeItem(PENDING_TOKEN_TOAST_KEY);
    const { tokenType } = JSON.parse(raw) as { tokenType: string };
    return tokenType ?? null;
  } catch {
    return null;
  }
}
