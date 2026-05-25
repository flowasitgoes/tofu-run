"use client";

import { useLocale } from "@/components/LocaleProvider";
import { TOKEN_TYPES } from "@/lib/constants";
import { getTokenLabelLocalized } from "@/lib/i18n-labels";
import type { TokenTypeId } from "@/lib/constants";
import type { GroundFeedItem } from "@/types/database";

function formatTime(iso: string, locale: string) {
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

export function LiveActivityFeed({ feed }: { feed: GroundFeedItem[] }) {
  const { locale, t } = useLocale();

  if (!feed.length) return null;

  return (
    <div className="mt-5">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-brown-sugar/70">
        {t("live.feed")}
      </h3>
      <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-2xl bg-cream/50 px-3 py-2">
        {feed.map((item) => {
          const tok = TOKEN_TYPES.find((x) => x.id === item.token_type);
          const label = tok
            ? getTokenLabelLocalized(tok.id as TokenTypeId, locale)
            : item.token_type;
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 text-xs text-brown-sugar/80"
            >
              <span className="min-w-0 truncate">
                <span className="font-mono font-medium text-twilight">
                  {item.runner_id}
                </span>
                {item.display_name.trim() ? (
                  <span className="text-brown-sugar">
                    {" "}
                    {item.display_name.trim()}
                  </span>
                ) : null}{" "}
                {t("live.feedEarned", { token: label })}
              </span>
              <time className="shrink-0 text-[10px] text-brown-sugar/45">
                {formatTime(item.scanned_at, locale)}
              </time>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-center text-[11px] text-brown-sugar/45">
        {t("live.feedHint")}
      </p>
    </div>
  );
}
