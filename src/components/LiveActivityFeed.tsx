"use client";

import { useLocale } from "@/components/LocaleProvider";
import { TOKEN_TYPES } from "@/lib/constants";
import { getTokenLabelLocalized } from "@/lib/i18n-labels";
import type { TokenTypeId } from "@/lib/constants";
import { sortFeedNewestFirst } from "@/lib/live-merge";
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

/** 固定高度 + 區塊內捲動，避免動態增加時整頁上下跳動 */
const FEED_SCROLL_CLASS =
  "h-48 min-h-48 max-h-48 overflow-y-auto overscroll-y-contain rounded-2xl bg-cream/50 px-3 py-2 [-webkit-overflow-scrolling:touch]";

export function LiveActivityFeed({ feed }: { feed: GroundFeedItem[] }) {
  const { locale, t } = useLocale();
  const orderedFeed = sortFeedNewestFirst(feed);

  return (
    <div className="mt-5">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-brown-sugar/70">
        {t("live.feed")}
      </h3>
      <div className={FEED_SCROLL_CLASS} aria-live="polite">
        {feed.length === 0 ? (
          <p className="flex h-full min-h-[10.5rem] items-center justify-center px-2 text-center text-[11px] leading-relaxed text-brown-sugar/45">
            {t("live.feedHint")}
          </p>
        ) : (
          <ul className="space-y-1.5">
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
        )}
      </div>
      {orderedFeed.length > 0 ? (
        <p className="mt-2 text-center text-[11px] text-brown-sugar/45">
          {t("live.feedHint")}
        </p>
      ) : null}
    </div>
  );
}
