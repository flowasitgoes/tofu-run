"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { Locale } from "@/i18n";

export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  function select(next: Locale) {
    if (next !== locale) setLocale(next);
  }

  return (
    <div
      className="inline-flex items-center rounded-full border border-brown-sugar/15 bg-cream/90 p-0.5 text-[11px] font-medium shadow-sm backdrop-blur-sm"
      role="group"
      aria-label="Language"
    >
      {(["zh", "en"] as const).map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => select(code)}
            className={`rounded-full px-2.5 py-1 transition-colors ${
              active
                ? "bg-brown-sugar text-cream"
                : "text-brown-sugar/60 hover:text-brown-sugar"
            }`}
            aria-pressed={active}
          >
            {t(`lang.${code}`)}
          </button>
        );
      })}
    </div>
  );
}
