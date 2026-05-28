import { NextResponse } from "next/server";
import {
  getUserById,
  getUserSessionForToday,
  insertTrailPoints,
  requireActiveLiveSession,
} from "@/lib/db";
import { LiveNotActiveError, LIVE_NOT_ACTIVE_ERROR } from "@/lib/live-gate";
import { TRAIL_UPLOAD_MAX_POINTS } from "@/lib/location-trail";
import type { TrailPointPayload } from "@/lib/location-trail";
import { normalizeRunnerId, RUNNER_ID_PATTERN } from "@/lib/runner";
import {
  isSupabaseConfigured,
  isSupabaseServiceConfigured,
} from "@/lib/supabase";

const MAX_POINT_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_MS = 60 * 1000;

function parseTrailPoint(raw: unknown): TrailPointPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const clientPointId =
    typeof p.clientPointId === "string" ? p.clientPointId.trim() : "";
  const recordedAt =
    typeof p.recordedAt === "string" ? p.recordedAt.trim() : "";
  const lat = typeof p.lat === "number" ? p.lat : NaN;
  const lng = typeof p.lng === "number" ? p.lng : NaN;
  const accuracyM =
    p.accuracyM === null || p.accuracyM === undefined
      ? null
      : typeof p.accuracyM === "number"
        ? p.accuracyM
        : NaN;

  if (!clientPointId || !recordedAt || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (accuracyM !== null && (!Number.isFinite(accuracyM) || accuracyM < 0)) {
    return null;
  }

  const recordedMs = Date.parse(recordedAt);
  if (!Number.isFinite(recordedMs)) return null;
  const now = Date.now();
  if (recordedMs < now - MAX_POINT_AGE_MS || recordedMs > now + MAX_FUTURE_MS) {
    return null;
  }

  return {
    clientPointId,
    recordedAt: new Date(recordedMs).toISOString(),
    lat,
    lng,
    accuracyM,
  };
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isSupabaseServiceConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未設定完整" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { userId, runnerId: rawRunnerId, sessionId, points: rawPoints } =
      body as {
        userId?: string;
        runnerId?: string;
        sessionId?: string;
        points?: unknown[];
      };

    const runnerId = rawRunnerId ? normalizeRunnerId(rawRunnerId) : "";
    if (!userId || !sessionId || !runnerId || !RUNNER_ID_PATTERN.test(runnerId)) {
      return NextResponse.json({ error: "缺少或無效的參數" }, { status: 400 });
    }

    if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
      return NextResponse.json({ error: "請提供軌跡點" }, { status: 400 });
    }
    if (rawPoints.length > TRAIL_UPLOAD_MAX_POINTS) {
      return NextResponse.json(
        { error: `單次最多 ${TRAIL_UPLOAD_MAX_POINTS} 個點` },
        { status: 400 }
      );
    }

    const session = await requireActiveLiveSession();
    if (session.id !== sessionId) {
      return NextResponse.json(
        { error: "場次與目前 LIVE 不符" },
        { status: 403 }
      );
    }

    const user = await getUserById(userId);
    if (!user || normalizeRunnerId(user.runner_id) !== runnerId) {
      return NextResponse.json({ error: "身份不符" }, { status: 403 });
    }

    const membership = await getUserSessionForToday(userId, sessionId);
    if (!membership) {
      return NextResponse.json({ error: "請先進入 LIVE" }, { status: 403 });
    }

    const points: TrailPointPayload[] = [];
    for (const raw of rawPoints) {
      const parsed = parseTrailPoint(raw);
      if (!parsed) {
        return NextResponse.json({ error: "軌跡點格式不正確" }, { status: 400 });
      }
      points.push(parsed);
    }

    const { inserted, skipped } = await insertTrailPoints(
      sessionId,
      userId,
      points
    );

    return NextResponse.json({ ok: true, inserted, skipped });
  } catch (e) {
    if (e instanceof LiveNotActiveError) {
      return NextResponse.json({ error: LIVE_NOT_ACTIVE_ERROR }, { status: 403 });
    }
    console.error(e);
    const message =
      e instanceof Error && e.message ? e.message : "軌跡上傳失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
