import {
  TRAIL_UPLOAD_MAX_POINTS,
  type TrailPointPayload,
  type TrailUploadBody,
} from "@/lib/location-trail";
import { LIVE_NOT_ACTIVE_ERROR } from "@/lib/live-gate";

export type TrailUploadResult =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; sessionClosed: boolean; error: string };

export async function uploadTrailBatch(
  runnerId: string,
  userId: string,
  sessionId: string,
  points: TrailPointPayload[]
): Promise<TrailUploadResult> {
  if (points.length === 0) {
    return { ok: true, inserted: 0, skipped: 0 };
  }

  const body: TrailUploadBody = {
    runnerId,
    userId,
    sessionId,
    points: points.slice(0, TRAIL_UPLOAD_MAX_POINTS),
  };

  const res = await fetch("/api/live/trail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    inserted?: number;
    skipped?: number;
  };

  if (!res.ok) {
    const sessionClosed = Boolean(
      res.status === 403 &&
        (data.error === LIVE_NOT_ACTIVE_ERROR ||
          data.error?.includes("活動尚未開始") ||
          data.error?.includes("已結束"))
    );
    return {
      ok: false,
      sessionClosed,
      error: data.error ?? "軌跡上傳失敗",
    };
  }

  return {
    ok: true,
    inserted: data.inserted ?? points.length,
    skipped: data.skipped ?? 0,
  };
}
