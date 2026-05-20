import { en } from "./messages/en";
import { zh, type Messages } from "./messages/zh";
import type { Locale } from "./types";

const catalogs: Record<Locale, Messages> = { zh, en };

export type { Locale } from "./types";
export type { Messages } from "./messages/zh";
export { LOCALE_COOKIE, DEFAULT_LOCALE, parseLocale } from "./types";

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}

type Params = Record<string, string | number>;

function getPath(obj: unknown, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof value === "string" ? value : undefined;
}

export function createTranslator(locale: Locale) {
  const messages = getMessages(locale);

  return function t(path: string, params?: Params): string {
    let text = getPath(messages, path) ?? path;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        text = text.replaceAll(`{${key}}`, String(value));
      }
    }
    return text;
  };
}
