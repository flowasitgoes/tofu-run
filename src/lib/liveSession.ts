import { getTodayDateString } from "@/lib/session";
import type {
  GroundFeedItem,
  LiveGroundPayload,
  LiveParticipant,
} from "@/types/database";

const RUNNER_KEY = "tofu-run-live-runner";
const ROOM_KEY = "tofu-run-live-room";
const GROUND_KEY = "tofu-run-live-ground";

/** 快取結構版本（遞增後舊 sessionStorage 會失效並重抓 API） */
export const LIVE_CACHE_VERSION = 8;
const RETURNING_KEY = "tofu-run-live-returning";
const PENDING_TOKEN_KEY = "tofu-run-pending-token";

/** 掃描成功後回 LIVE：略過立即 refetch，先顯示快取 */
const RETURNING_TTL_MS = 8000;

export type PendingTokenEarn = {
  tokenType: string;
  scannedAt: string;
  sessionDate: string;
};

export type LiveRoomCache = {
  v: number;
  runnerId: string;
  sessionDate: string;
  sessionDateLabel: string;
  sessionId: string;
  count: number;
  onlineCount: number;
  participants: LiveParticipant[];
  feed: GroundFeedItem[];
  cachedAt: number;
};

export type LiveGroundCache = LiveGroundPayload & {
  v: number;
  runnerId: string;
  sessionDate: string;
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
  storage()?.removeItem(GROUND_KEY);
}

export function getLiveRoomCache(runnerId: string): LiveRoomCache | null {
  try {
    const raw = storage()?.getItem(ROOM_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as LiveRoomCache;
    if (entry.v !== LIVE_CACHE_VERSION) return null;
    if (entry.runnerId !== runnerId) return null;
    if (entry.sessionDate !== getTodayDateString()) return null;
    return entry;
  } catch {
    return null;
  }
}

export function setLiveRoomCache(
  data: Omit<LiveRoomCache, "cachedAt" | "runnerId" | "v"> & {
    runnerId: string;
  }
): void {
  const entry: LiveRoomCache = {
    ...data,
    v: LIVE_CACHE_VERSION,
    cachedAt: Date.now(),
  };
  storage()?.setItem(ROOM_KEY, JSON.stringify(entry));
}

export function getLiveGroundCache(runnerId: string): LiveGroundCache | null {
  try {
    const raw = storage()?.getItem(GROUND_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as LiveGroundCache;
    if (entry.v !== LIVE_CACHE_VERSION) return null;
    if (entry.runnerId !== runnerId) return null;
    if (entry.sessionDate !== getTodayDateString()) return null;
    return entry;
  } catch {
    return null;
  }
}

export function setLiveGroundCache(
  runnerId: string,
  payload: LiveGroundPayload
): void {
  const entry: LiveGroundCache = {
    ...payload,
    v: LIVE_CACHE_VERSION,
    runnerId,
    sessionDate: payload.sessionDate,
    cachedAt: Date.now(),
  };
  storage()?.setItem(GROUND_KEY, JSON.stringify(entry));
}

/** LIVE 在場時預熱 Ground API，進看板可先顯示快取 */
export function prefetchLiveGroundCache(runnerId: string): void {
  const q = `?runnerId=${encodeURIComponent(runnerId)}`;
  void fetch(`/api/live/ground${q}`, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return;
      const payload = (await res.json()) as LiveGroundPayload;
      if (payload?.sessionId) setLiveGroundCache(runnerId, payload);
    })
    .catch(() => {});
}

/** 掃描完成、即將回 LIVE 時標記（sessionStorage） */
export function markReturningFromScan(pending?: PendingTokenEarn): void {
  const s = storage();
  if (!s) return;
  s.setItem(
    RETURNING_KEY,
    JSON.stringify({ at: Date.now(), sessionDate: getTodayDateString() })
  );
  if (pending) {
    s.setItem(PENDING_TOKEN_KEY, JSON.stringify(pending));
  }
}

export function isReturningFromScan(): boolean {
  try {
    const raw = storage()?.getItem(RETURNING_KEY);
    if (!raw) return false;
    const { at, sessionDate } = JSON.parse(raw) as {
      at: number;
      sessionDate: string;
    };
    if (sessionDate !== getTodayDateString()) return false;
    return Date.now() - at < RETURNING_TTL_MS;
  } catch {
    return false;
  }
}

export function clearReturningFromScan(): void {
  storage()?.removeItem(RETURNING_KEY);
}

/** 回 LIVE 時顯示剛掃到的 Token 提示（讀一次即清除） */
export function consumePendingTokenEarn(): PendingTokenEarn | null {
  try {
    const raw = storage()?.getItem(PENDING_TOKEN_KEY);
    storage()?.removeItem(PENDING_TOKEN_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as PendingTokenEarn;
    if (entry.sessionDate !== getTodayDateString()) return null;
    return entry;
  } catch {
    return null;
  }
}
