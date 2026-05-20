export type Locale = "zh" | "en";

export const LOCALE_COOKIE = "tofu-run-locale";
export const DEFAULT_LOCALE: Locale = "zh";

export function parseLocale(value: string | undefined | null): Locale {
  return value === "en" ? "en" : "zh";
}
