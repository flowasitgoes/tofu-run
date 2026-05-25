"use client";

import { useLocale } from "@/components/LocaleProvider";
import { TokenIcon } from "@/components/TokenIcon";
import { BASE_TOFU_TOKEN_ID, TOKEN_TYPES } from "@/lib/constants";
import { getTokenLabelLocalized } from "@/lib/i18n-labels";
import type { TokenTypeId } from "@/lib/constants";
import type { LiveGroundPayload } from "@/types/database";

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

const LAST_TOKEN_ID = TOKEN_TYPES[TOKEN_TYPES.length - 1]!.id;

function tokenColumnClass(tokenId: string) {
  if (tokenId === LAST_TOKEN_ID) {
    return tokenId === BASE_TOFU_TOKEN_ID
      ? "w-14 min-w-[3.5rem] pl-1 pr-4"
      : "w-10 pl-2 pr-4";
  }
  return tokenId === BASE_TOFU_TOKEN_ID
    ? "w-14 min-w-[3.5rem] px-1"
    : "w-10 px-2";
}

const completeColumnClass = "border-l border-brown-sugar/15 pl-4 pr-2 text-center";

function CompleteCheckIcon({ label }: { label: string }) {
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded bg-mung-green text-cream"
      title={label}
      aria-label={label}
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 8.5l3 3 7-7" />
      </svg>
    </span>
  );
}

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
      <div className="overflow-x-auto rounded-2xl border border-brown-sugar/10 bg-tofu-white/90">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-brown-sugar/10 text-xs text-brown-sugar/55">
              <th className="min-w-[7.5rem] px-3 py-2 font-medium">
                {t("ground.player")}
              </th>
              {TOKEN_TYPES.map((tok) => (
                <th
                  key={tok.id}
                  className={`${tokenColumnClass(tok.id)} py-2 text-center`}
                >
                  <TokenIcon
                    src={tok.image}
                    alt={tok.label}
                    size={tok.id === BASE_TOFU_TOKEN_ID ? 48 : 24}
                    className="mx-auto"
                  />
                </th>
              ))}
              <th
                className={`w-12 py-2 font-medium ${completeColumnClass}`}
              >
                {t("ground.complete")}
              </th>
              <th className="min-w-[3.25rem] px-3 py-2 text-center font-medium whitespace-nowrap">
                {t("ground.completedAt")}
              </th>
            </tr>
          </thead>
          <tbody>
            {payload.participants.map((row) => {
              const isMe = highlightRunnerId === row.runner_id;
              return (
                <tr
                  key={row.user_id}
                  className={
                    isMe
                      ? "bg-sunset/15"
                      : "border-t border-brown-sugar/5"
                  }
                >
                  <td className="min-w-[7.5rem] px-3 py-2.5">
                    <p className="font-mono text-xs font-semibold text-twilight">
                      {row.runner_id}
                    </p>
                    <p className="text-xs text-brown-sugar">{row.display_name}</p>
                    {row.goal && (
                      <p className="text-[10px] leading-snug text-mung-green">
                        {row.goal}
                      </p>
                    )}
                  </td>
                  {TOKEN_TYPES.map((tok) => {
                    const at = row.earned[tok.id];
                    const needed = row.requiredTokenIds.includes(tok.id);
                    return (
                      <td
                        key={tok.id}
                        className={`${tokenColumnClass(tok.id)} py-2.5 text-center`}
                      >
                        {at ? (
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-mung-green/20 text-mung-green"
                            title={formatTime(at, locale)}
                          >
                            ✓
                          </span>
                        ) : needed ? (
                          <span className="inline-block h-7 w-7 rounded-full border border-dashed border-brown-sugar/15" />
                        ) : (
                          <span
                            className="inline-block h-7 w-7 text-[10px] leading-7 text-brown-sugar/20"
                            aria-hidden
                          >
                            ·
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className={`w-12 py-2.5 ${completeColumnClass}`}>
                    {row.isComplete ? (
                      <CompleteCheckIcon label={t("ground.completeDone")} />
                    ) : (
                      <span className="inline-block h-7 w-7 rounded border border-brown-sugar/10 bg-cream/60" />
                    )}
                  </td>
                  <td className="min-w-[3.25rem] px-3 py-2.5 text-center text-xs text-brown-sugar/75 whitespace-nowrap">
                    {row.isComplete && row.completedAt ? (
                      <time dateTime={row.completedAt}>
                        {formatTime(row.completedAt, locale)}
                      </time>
                    ) : (
                      <span className="text-brown-sugar/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {payload.feed.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-brown-sugar/70">
            {t("ground.feed")}
          </h3>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-2xl bg-cream/50 px-3 py-2">
            {payload.feed.map((item) => {
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
                    {formatTime(item.scanned_at, locale)}
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
