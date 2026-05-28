"use client";

import type { Session } from "@/types/database";
import {
  eventEndAtFromStart,
  hasExplicitEventEnd,
  resolveEventSchedule,
} from "@/lib/event-schedule";
import { formatTaipeiDateTime } from "@/lib/session";

/** 管理後台：官方開始／預設結束／實際關閉時間（不顯示於護照） */
export function AdminSessionScheduleSummary({
  session,
}: {
  session: Session;
}) {
  const explicitEnd = hasExplicitEventEnd(session.date)
    ? resolveEventSchedule(session.date)?.endAt ?? null
    : null;
  const eventEndAt = session.started_at
    ? eventEndAtFromStart(session.started_at, explicitEnd)
    : null;
  const showDefaultEndHint = Boolean(session.started_at && !explicitEnd);

  return (
    <div className="mb-4 space-y-1.5 rounded-xl border border-brown-sugar/10 bg-cream/50 px-3 py-2.5 text-sm text-brown-sugar">
      <p>
        <span className="text-brown-sugar/60">官方開始：</span>
        {session.started_at ? (
          formatTaipeiDateTime(session.started_at, "zh")
        ) : (
          <span className="text-brown-sugar/50">—</span>
        )}
      </p>
      <p>
        <span className="text-brown-sugar/60">活動結束：</span>
        {eventEndAt ? (
          <>
            {formatTaipeiDateTime(eventEndAt, "zh")}
            {showDefaultEndHint ? (
              <span className="ml-1 text-[10px] text-brown-sugar/45">
                （預設為開始後 2 小時）
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-brown-sugar/50">—</span>
        )}
      </p>
      <p>
        <span className="text-brown-sugar/60">活動關閉時間：</span>
        {session.ended_at ? (
          formatTaipeiDateTime(session.ended_at, "zh")
        ) : (
          <span className="text-brown-sugar/50">—</span>
        )}
      </p>
    </div>
  );
}
