import { getTodayDateString } from "@/lib/session";

export type LivePhase = "idle" | "active";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidSessionDateString(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** 台北「今天」；不可選過去日期 */
export function minSelectableSessionDate(): string {
  return getTodayDateString();
}

export function isPastSessionDate(
  date: string,
  today = minSelectableSessionDate()
): boolean {
  return date < today;
}

export function parseLivePhase(status: string | null | undefined): LivePhase {
  return status === "active" ? "active" : "idle";
}
