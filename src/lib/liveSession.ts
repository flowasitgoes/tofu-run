import type {
  GroundFeedItem,
  LiveGroundPayload,
  LiveParticipant,
} from "@/types/database";

const RUNNER_KEY = "tofu-run-live-runner";
const ROOM_KEY = "tofu-run-live-room";
const GROUND_KEY = "tofu-run-live-ground";

/** 快取結構版本（遞增後舊 sessionStorage 會失效並重抓 API） */
export const LIVE_CACHE_VERSION = 10;
const RETURNING_KEY = "tofu-run-live-returning";
const PENDING_TOKEN_KEY = "tofu-run-pending-token";

/** 掃描成功後回 LIVE：略過立即 refetch，先顯示快取 */
const RETURNING_TTL_MS = 8000;

export type LiveSessionContext = {
  runnerId: string;
  sessionId: string;
  sessionDate: string;
};

export type PendingTokenEarn = {
  tokenType: string;
  scannedAt: string;
  sessionId: string;
  sessionDate: string;
};

export type LiveRoomCache = {
  v: number;
  runnerId: string;
  sessionId: string;
  sessionDate: string;
  sessionDateLabel: string;
  count: number;
  onlineCount: number;
  participants: LiveParticipant[];
  feed: GroundFeedItem[];
  cachedAt: number;
};

export type LiveGroundCache = LiveGroundPayload & {
  v: number;
  runnerId: string;
  sessionId: string;
  sessionDate: string;
  cachedAt: number;
};

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function getStoredLiveContext(): LiveSessionContext | null {
  try {
    const raw = storage()?.getItem(RUNNER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      runnerId?: string;
      sessionId?: string;
      sessionDate?: string;
    };
    if (
      !parsed.runnerId ||
      !parsed.sessionId ||
      !parsed.sessionDate
    ) {
      return null;
    }
    return {
      runnerId: parsed.runnerId,
      sessionId: parsed.sessionId,
      sessionDate: parsed.sessionDate,
    };
  } catch {
    return null;
  }
}

export function setStoredLiveContext(ctx: LiveSessionContext): void {
  storage()?.setItem(RUNNER_KEY, JSON.stringify(ctx));
}

export function getStoredLiveRunnerId(): string | null {
  return getStoredLiveContext()?.runnerId ?? null;
}

export function setStoredLiveRunnerId(
  runnerId: string,
  sessionId: string,
  sessionDate: string
): void {
  setStoredLiveContext({ runnerId, sessionId, sessionDate });
}

/** 場次已結束或切換時清除 */
export function clearStoredLiveSession(): void {
  storage()?.removeItem(RUNNER_KEY);
  storage()?.removeItem(ROOM_KEY);
  storage()?.removeItem(GROUND_KEY);
  storage()?.removeItem(RETURNING_KEY);
  storage()?.removeItem(PENDING_TOKEN_KEY);
}

function contextMatches(
  ctx: LiveSessionContext | null,
  sessionId: string,
  runnerId?: string
): boolean {
  if (!ctx || ctx.sessionId !== sessionId) return false;
  if (runnerId && ctx.runnerId !== runnerId) return false;
  return true;
}

export function getLiveRoomCache(
  runnerId: string,
  sessionId: string
): LiveRoomCache | null {
  try {
    const raw = storage()?.getItem(ROOM_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as LiveRoomCache;
    if (entry.v !== LIVE_CACHE_VERSION) return null;
    if (entry.runnerId !== runnerId) return null;
    if (entry.sessionId !== sessionId) return null;
    return entry;
  } catch {
    return null;
  }
}

export function setLiveRoomCache(
  data: Omit<
    LiveRoomCache,
    "cachedAt" | "runnerId" | "v" | "sessionId" | "sessionDate"
  > & {
    runnerId: string;
    sessionId: string;
    sessionDate: string;
  }
): void {
  const entry: LiveRoomCache = {
    ...data,
    v: LIVE_CACHE_VERSION,
    cachedAt: Date.now(),
  };
  storage()?.setItem(ROOM_KEY, JSON.stringify(entry));
}

export function getLiveGroundCache(
  runnerId: string,
  sessionId: string
): LiveGroundCache | null {
  try {
    const raw = storage()?.getItem(GROUND_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as LiveGroundCache;
    if (entry.v !== LIVE_CACHE_VERSION) return null;
    if (entry.runnerId !== runnerId) return null;
    if (entry.sessionId !== sessionId) return null;
    return entry;
  } catch {
    return null;
  }
}

export function setLiveGroundCache(
  runnerId: string,
  sessionId: string,
  payload: LiveGroundPayload
): void {
  const entry: LiveGroundCache = {
    ...payload,
    v: LIVE_CACHE_VERSION,
    runnerId,
    sessionId,
    sessionDate: payload.sessionDate,
    cachedAt: Date.now(),
  };
  storage()?.setItem(GROUND_KEY, JSON.stringify(entry));
}

/** 掃描成功後預拉 LIVE 名單，回 /live 時列表與 toast 同步 */
export async function prefetchLiveRoomCache(
  runnerId: string,
  signal?: AbortSignal
): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/live?runnerId=${encodeURIComponent(runnerId)}`,
      { cache: "no-store", signal }
    );
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.sessionId) return false;
    setLiveRoomCache({
      runnerId,
      sessionId: data.sessionId as string,
      sessionDate: data.sessionDate as string,
      sessionDateLabel: data.sessionDateLabel as string,
      count: data.count ?? 0,
      onlineCount: data.onlineCount ?? 0,
      participants: data.participants ?? [],
      feed: data.feed ?? [],
    });
    setStoredLiveContext({
      runnerId,
      sessionId: data.sessionId as string,
      sessionDate: data.sessionDate as string,
    });
    return true;
  } catch {
    return false;
  }
}

/** LIVE 在場時預熱 Ground API，進看板可先顯示快取 */
export function prefetchLiveGroundCache(runnerId: string): void {
  const q = `?runnerId=${encodeURIComponent(runnerId)}`;
  void fetch(`/api/live/ground${q}`, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return;
      const payload = (await res.json()) as LiveGroundPayload;
      if (payload?.sessionId) {
        setLiveGroundCache(runnerId, payload.sessionId, payload);
      }
    })
    .catch(() => {});
}

/** 掃描完成、即將回 LIVE 時標記（sessionStorage） */
export function markReturningFromScan(
  pending?: PendingTokenEarn
): void {
  const s = storage();
  if (!s) return;
  const ctx = getStoredLiveContext();
  s.setItem(
    RETURNING_KEY,
    JSON.stringify({
      at: Date.now(),
      sessionId: ctx?.sessionId ?? pending?.sessionId,
    })
  );
  if (pending) {
    s.setItem(PENDING_TOKEN_KEY, JSON.stringify(pending));
  }
}

export function isReturningFromScan(sessionId: string | null): boolean {
  if (!sessionId) return false;
  try {
    const raw = storage()?.getItem(RETURNING_KEY);
    if (!raw) return false;
    const { at, sessionId: storedId } = JSON.parse(raw) as {
      at: number;
      sessionId?: string;
    };
    if (storedId && storedId !== sessionId) return false;
    return Date.now() - at < RETURNING_TTL_MS;
  } catch {
    return false;
  }
}

export function clearReturningFromScan(): void {
  storage()?.removeItem(RETURNING_KEY);
}

/** 回 LIVE 時顯示剛掃到的 Token 提示（讀一次即清除） */
export function consumePendingTokenEarn(
  sessionId: string | null
): PendingTokenEarn | null {
  try {
    const raw = storage()?.getItem(PENDING_TOKEN_KEY);
    storage()?.removeItem(PENDING_TOKEN_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as PendingTokenEarn;
    if (sessionId && entry.sessionId !== sessionId) return null;
    return entry;
  } catch {
    return null;
  }
}

export function syncStoredLiveWithActive(
  activeSessionId: string | null
): void {
  const ctx = getStoredLiveContext();
  if (!ctx) return;
  if (!activeSessionId || ctx.sessionId !== activeSessionId) {
    clearStoredLiveSession();
  }
}
