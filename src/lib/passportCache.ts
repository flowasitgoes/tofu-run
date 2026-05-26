import type { PassportAccount } from "@/types/database";

const CACHE_KEY = "tofu-run-passport-cache-v4";

/** 報名資料很少變，快取 15 分鐘；背景仍會更新 */
const TTL_MS = 15 * 60 * 1000;

type PassportCacheEntry = {
  runnerId: string;
  account: PassportAccount;
  cachedAt: number;
};

export function getPassportCache(
  runnerId: string
): { account: PassportAccount; stale: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as PassportCacheEntry;
    if (entry.runnerId !== runnerId) return null;
    const stale = Date.now() - entry.cachedAt > TTL_MS;
    return { account: entry.account, stale };
  } catch {
    return null;
  }
}

export function setPassportCache(
  runnerId: string,
  account: PassportAccount
): void {
  const entry: PassportCacheEntry = {
    runnerId,
    account,
    cachedAt: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
}

export function clearPassportCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
