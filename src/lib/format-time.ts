/** 活動時間（台北） */
export function formatTaipeiTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleTimeString(locale === "en" ? "en-US" : "zh-TW", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Taipei",
    });
  } catch {
    return "";
  }
}
