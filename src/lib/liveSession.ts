import { getTodayDateString } from "@/lib/session";
import type { LiveParticipant } from "@/types/database";

const RUNNER_KEY = "tofu-run-live-runner";
const ROOM_KEY = "tofu-run-live-room";

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
