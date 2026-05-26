export function getTodayDateString(): string {
  const now = new Date();
  const tz = "Asia/Taipei";
  return now.toLocaleDateString("en-CA", { timeZone: tz });
}

export function formatDurationMinutes(
  startIso: string,
  endIso: string
): number | null {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  return Math.round((end - start) / 60000);
}

export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}/${m}/${d}`;
}

const TAIPEI_TZ = "Asia/Taipei";

/** 護照／活動紀錄：顯示台北時間（含上午下午） */
export function formatTaipeiDateTime(
  iso: string,
  locale: "zh" | "en" = "zh"
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(locale === "en" ? "en-US" : "zh-TW", {
    timeZone: TAIPEI_TZ,
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
