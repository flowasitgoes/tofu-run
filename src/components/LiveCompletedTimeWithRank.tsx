"use client";

import { formatTaipeiTime } from "@/lib/format-time";

type LiveCompletedTimeWithRankProps = {
  completedAt: string;
  rank: number;
  locale: string;
  rankAriaLabel: string;
};

/** 完成時間 + 右下角紫色方塊名次（白字） */
export function LiveCompletedTimeWithRank({
  completedAt,
  rank,
  locale,
  rankAriaLabel,
}: LiveCompletedTimeWithRankProps) {
  return (
    <span className="relative mr-1.5 inline-block shrink-0 whitespace-nowrap">
      <time
        dateTime={completedAt}
        className="block -translate-x-[2px] pr-3.5 pb-2 text-[10px] text-brown-sugar/60"
      >
        {formatTaipeiTime(completedAt, locale)}
      </time>
      <span
        className="absolute -bottom-[2px] right-0 flex h-4 min-w-4 translate-x-[4px] items-center justify-center rounded-[3px] bg-twilight px-0.5 text-[9px] font-bold leading-none text-white"
        aria-label={rankAriaLabel}
      >
        {rank}
      </span>
    </span>
  );
}
