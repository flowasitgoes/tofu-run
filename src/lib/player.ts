import { STORAGE_KEY } from "@/lib/constants";
import type { StoredPlayer } from "@/types/database";

export type { StoredPlayer };
export const PLAYER_UPDATED_EVENT = "tofu-run-player-updated";

export function getStoredPlayer(): StoredPlayer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPlayer;
  } catch {
    return null;
  }
}

export function setStoredPlayer(player: StoredPlayer): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  window.dispatchEvent(new Event(PLAYER_UPDATED_EVENT));
}

export function clearStoredPlayer(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(PLAYER_UPDATED_EVENT));
}

export function generateRunnerId(): string {
  const prefixes = ["TOFU", "BEAN", "MUNG"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}

export function generateRunnerName(): string {
  const names = [
    "紅豆獵人",
    "小綠豆",
    "粉圓旅人",
    "黑糖漫遊者",
    "芋圓騎士",
    "花生行者",
    "豆花旅伴",
    "夕陽慢跑者",
    "中央公園豆友",
    "糖水探險家",
    "糯米團子",
    "仙草漫遊",
  ];
  return names[Math.floor(Math.random() * names.length)];
}
