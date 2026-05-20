"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createTranslator,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  parseLocale,
  type Locale,
} from "@/i18n";
import { localizeErrorMessage } from "@/i18n/api-errors";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof createTranslator>;
  localizeError: (message: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readCookieLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`)
  );
  return parseLocale(match?.[1] ? decodeURIComponent(match[1]) : null);
}

function writeCookieLocale(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(readCookieLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeCookieLocale(next);
    document.documentElement.lang = next === "en" ? "en" : "zh-Hant";
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "zh-Hant";
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const t = createTranslator(locale);
    return {
      locale,
      setLocale,
      t,
      localizeError: (message: string) =>
        localizeErrorMessage(message, locale),
    };
  }, [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
