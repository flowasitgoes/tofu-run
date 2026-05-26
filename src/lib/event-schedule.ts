/**
 * 活動日官方開始／結束時間（台北時區）。
 * 活動日前可留空；當日確定後在 EVENT_DAY_SCHEDULES 填入該日 date 與開始時間即可。
 * 結束時間未填時，預設為開始後 1 小時。
 *
 * 環境變數（單日測試）：
 * NEXT_PUBLIC_EVENT_DATE=2026-06-01
 * NEXT_PUBLIC_EVENT_START_AT=2026-06-01T07:00:00+08:00
 * NEXT_PUBLIC_EVENT_END_AT=2026-06-01T12:00:00+08:00  （可省略，省略則 +1 小時）
 */

export type EventDaySchedule = {
  date: string;
  startAt: string;
  endAt: string;
};

export const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;

/** 依活動日 YYYY-MM-DD 設定；endAt 可省略 → 開始後 1 小時 */
export const EVENT_DAY_SCHEDULES: Record<
  string,
  { startAt: string; endAt?: string }
> = {
  // 範例：
  // "2026-06-15": {
  //   startAt: "2026-06-15T07:00:00+08:00",
  // },
};

/** 有明確結束用明確值，否則開始 + 1 小時 */
export function eventEndAtFromStart(
  startAt: string,
  explicitEndAt?: string | null
): string | null {
  const start = startAt?.trim();
  if (!start) return null;
  const explicit = explicitEndAt?.trim();
  if (explicit) return explicit;

  const startMs = new Date(start).getTime();
  if (Number.isNaN(startMs)) return null;
  return new Date(startMs + DEFAULT_EVENT_DURATION_MS).toISOString();
}

export function resolveEventSchedule(
  sessionDate: string
): EventDaySchedule | null {
  const fromTable = EVENT_DAY_SCHEDULES[sessionDate];
  if (fromTable?.startAt) {
    const endAt = eventEndAtFromStart(fromTable.startAt, fromTable.endAt);
    if (!endAt) return null;
    return { date: sessionDate, startAt: fromTable.startAt, endAt };
  }

  const envDate = process.env.NEXT_PUBLIC_EVENT_DATE?.trim();
  const envStart = process.env.NEXT_PUBLIC_EVENT_START_AT?.trim();
  const envEnd = process.env.NEXT_PUBLIC_EVENT_END_AT?.trim();
  if (envDate === sessionDate && envStart) {
    const endAt = eventEndAtFromStart(envStart, envEnd);
    if (!endAt) return null;
    return { date: sessionDate, startAt: envStart, endAt };
  }

  return null;
}

export function hasExplicitEventEnd(sessionDate: string): boolean {
  const row = EVENT_DAY_SCHEDULES[sessionDate];
  if (row?.endAt) return true;
  if (
    process.env.NEXT_PUBLIC_EVENT_DATE?.trim() === sessionDate &&
    process.env.NEXT_PUBLIC_EVENT_END_AT?.trim()
  ) {
    return true;
  }
  return false;
}
