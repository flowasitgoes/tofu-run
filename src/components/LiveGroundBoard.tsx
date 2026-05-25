"use client";

import { useLocale } from "@/components/LocaleProvider";
import { LiveParticipantTokenIcons } from "@/components/LiveParticipantTokenIcons";
import { getTokenLabelLocalized } from "@/lib/i18n-labels";
import { TOKEN_TYPES } from "@/lib/constants";
import type { TokenTypeId } from "@/lib/constants";
import { formatTaipeiTime } from "@/lib/format-time";
import { sortFeedNewestFirst } from "@/lib/live-merge";
import type { LiveGroundPayload } from "@/types/database";

function earnedIdsInScanOrder(
  earned: Record<string, string | null>,
  earnedTokenIds?: string[]
): string[] {
  if (earnedTokenIds?.length) return earnedTokenIds;
  return Object.entries(earned)
    .filter((entry): entry is [string, string] => entry[1] != null)
    .sort(
      (a, b) =>
        new Date(a[1]).getTime() - new Date(b[1]).getTime()
    )
    .map(([id]) => id);
}

import { LiveCompleteBadge } from "@/components/LiveCompleteBadge";

export function LiveGroundBoard({
  payload,
  highlightRunnerId,
}: {
  payload: LiveGroundPayload;
  highlightRunnerId?: string | null;
}) {
  const { locale, t } = useLocale();

  if (payload.participants.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-brown-sugar/60">
        {t("ground.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-brown-sugar/8">
        {payload.participants.map((row) => {
          const isMe = highlightRunnerId === row.runner_id;
          return (
            <li
              key={row.user_id}
              className={`flex items-center gap-2 py-3 ${
                isMe ? "bg-sunset/10 -mx-1 rounded-xl px-1" : ""
              }`}
            >
              <div className="w-[6.75rem] min-w-0 shrink-0">
                <p className="truncate font-mono text-xs font-semibold text-twilight">
                  {row.runner_id}
                </p>
                <p className="truncate text-xs text-brown-sugar">
                  {row.display_name}
                </p>
                {row.goal && (
                  <p className="truncate text-[10px] leading-snug text-mung-green">
                    {row.goal}
                  </p>
                )}
              </div>

              <LiveParticipantTokenIcons
                tokenIds={earnedIdsInScanOrder(row.earned, row.earned_token_ids)}
                layout="flow"
              />

              <div className="flex shrink-0 flex-col items-end gap-0.5">
                {row.isComplete ? (
                  <LiveCompleteBadge label={t("ground.completeDone")} />
                ) : (
                  <span
                    className="inline-block h-6 w-6 rounded border border-brown-sugar/10 bg-cream/60"
                    aria-hidden
                  />
                )}
                {row.isComplete && row.completedAt ? (
                  <time
                    dateTime={row.completedAt}
                    className="text-[10px] text-brown-sugar/60 whitespace-nowrap"
                  >
                    {formatTaipeiTime(row.completedAt, locale)}
                  </time>
                ) : (
                  <span className="text-[10px] text-brown-sugar/30">—</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {payload.feed.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-brown-sugar/70">
            {t("ground.feed")}
          </h3>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-2xl bg-cream/50 px-3 py-2">
            {sortFeedNewestFirst(payload.feed).map((item) => {
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
                    {t("ground.feedEarned", { token: label })}
                  </span>
                  <time className="shrink-0 text-[10px] text-brown-sugar/45">
                    {formatTaipeiTime(item.scanned_at, locale)}
                  </time>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
