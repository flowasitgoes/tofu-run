"use client";

import { useLocale } from "@/components/LocaleProvider";
import { LiveCompleteBadge } from "@/components/LiveCompleteBadge";
import {
  LiveParticipantTokenIcons,
  LiveTofuProgressRow,
} from "@/components/LiveParticipantTokenIcons";
import { countCompletedBowls } from "@/lib/ground-completion";
import type { LiveParticipant } from "@/types/database";

function OnlineBadge({ label }: { label: string }) {
  return (
    <span
      className="relative flex h-6 w-6 shrink-0 items-center justify-center"
      title={label}
      aria-label={label}
    >
      <span
        className="absolute h-6 w-6 rounded-full bg-mung-green/20"
        aria-hidden
      />
      <span
        className="relative h-3 w-3 rounded-full bg-mung-green ring-2 ring-cream"
        aria-hidden
      />
    </span>
  );
}

function OfflineBadge({ label }: { label: string }) {
  return (
    <span
      className="relative flex h-6 w-6 shrink-0 items-center justify-center"
      title={label}
      aria-label={label}
    >
      <span
        className="absolute h-6 w-6 rounded-full bg-brown-sugar/12"
        aria-hidden
      />
      <span
        className="relative h-3 w-3 rounded-full bg-brown-sugar/35 ring-2 ring-cream"
        aria-hidden
      />
    </span>
  );
}

type LiveParticipantsListProps = {
  participants: LiveParticipant[];
  count: number;
  onlineCount: number;
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  highlightRunnerId?: string | null;
  onRefresh?: () => void;
};

export function LiveParticipantsList({
  participants,
  count,
  onlineCount,
  loading = false,
  refreshing = false,
  error = null,
  highlightRunnerId = null,
  onRefresh,
}: LiveParticipantsListProps) {
  const { t } = useLocale();

  const showEmpty = !loading && !error && participants.length === 0;
  const showList = participants.length > 0 || loading;

  return (
    <>
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-brown-sugar">
            {t("live.participants")}
          </h2>
          <p className="text-xs text-brown-sugar/50">
            {t("live.countOnline", {
              count: loading && count === 0 ? "…" : count,
              online:
                loading && onlineCount === 0 && count === 0
                  ? "…"
                  : onlineCount,
            })}
            {refreshing ? (
              <span className="ml-1.5 text-brown-sugar/40">
                {t("common.refreshing")}
              </span>
            ) : null}
          </p>
        </div>
        <h2 className="pt-0.5 text-center text-sm font-semibold whitespace-nowrap text-brown-sugar">
          {t("live.tokenProgress")}
        </h2>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="justify-self-end text-xs text-brown-sugar/60 underline disabled:opacity-40"
          >
            {refreshing ? t("common.refreshing") : t("common.refresh")}
          </button>
        ) : (
          <span className="justify-self-end" aria-hidden />
        )}
      </div>

      {loading && !showList && (
        <p className="animate-pulse-soft py-8 text-center text-sm text-brown-sugar/60">
          {t("common.loading")}
        </p>
      )}
      {error && !showList && (
        <p className="py-4 text-center text-sm text-red-bean">{error}</p>
      )}
      {showEmpty && (
        <p className="py-8 text-center text-sm text-brown-sugar/60">
          {t("live.firstIn")}
        </p>
      )}
      {showList && participants.length > 0 && (
        <ul className="divide-y divide-brown-sugar/8">
          {participants.map((p) => {
            const isHighlight = highlightRunnerId === p.runner_id;
            const bowlsDone = countCompletedBowls(
              p.required_token_ids ?? [],
              p.earned_token_ids ?? []
            );
            return (
              <li
                key={p.user_id}
                className={`flex items-start gap-2 py-3 ${
                  isHighlight ? "bg-sunset/10 -mx-1 rounded-xl px-1" : ""
                }`}
              >
                <div className="min-w-0 shrink-0">
                  <p className="truncate font-mono text-sm font-semibold text-twilight">
                    {p.runner_id}
                  </p>
                  <p className="truncate text-sm text-brown-sugar">
                    {p.display_name}
                  </p>
                  {p.goal ? (
                    <p className="mt-0.5 truncate text-xs text-mung-green">
                      {p.goal}
                    </p>
                  ) : null}
                  <LiveTofuProgressRow
                    tokenIds={p.earned_token_ids ?? []}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-visible">
                  {bowlsDone > 0 ? (
                    <div className="flex justify-center">
                      <LiveCompleteBadge
                        variant="earned"
                        earnedLabel={t("live.earnedBowls", { count: bowlsDone })}
                        label={t("ground.completeDone")}
                      />
                    </div>
                  ) : null}
                  <LiveParticipantTokenIcons
                    tokenIds={p.earned_token_ids ?? []}
                    className="min-w-0 w-full overflow-visible"
                    showScanCounts
                  />
                </div>
                <div className="flex shrink-0 flex-col items-center gap-0 self-center pl-0.5">
                  {isHighlight ? (
                    <span className="-mt-1 mb-0.5 rounded-full bg-sunset/20 px-2 py-0.5 text-[10px] font-medium leading-none text-brown-sugar">
                      {t("common.you")}
                    </span>
                  ) : null}
                  <div className="my-1">
                    {p.is_online ? (
                      <OnlineBadge label={t("live.online")} />
                    ) : (
                      <OfflineBadge label={t("live.offline")} />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
