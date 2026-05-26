import { NextResponse } from "next/server";
import {
  endActiveLiveSession,
  getActiveLiveSession,
  getLiveRoomData,
  getLiveStatusPayload,
  listUsedSessionDates,
  minSelectableSessionDate,
  startLiveSession,
} from "@/lib/db";
import { ensureSessionsLiveSchema } from "@/lib/sessions-schema-setup";
import { adminAuthErrorResponse, verifyAdminRequest } from "@/lib/admin-auth";
import { formatDisplayDate } from "@/lib/session";
import {
  isSupabaseConfigured,
  isSupabaseServiceConfigured,
} from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = verifyAdminRequest(request);
  if (!auth.ok) {
    const { status, body } = adminAuthErrorResponse(auth);
    return NextResponse.json(body, { status });
  }

  if (!isSupabaseConfigured() || !isSupabaseServiceConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未設定完整" },
      { status: 503 }
    );
  }

  try {
    const [status, usedDates, active] = await Promise.all([
      getLiveStatusPayload(),
      listUsedSessionDates(),
      getActiveLiveSession(),
    ]);

    let participants: Awaited<
      ReturnType<typeof getLiveRoomData>
    >["participants"] = [];
    let count = 0;
    let onlineCount = 0;

    if (active) {
      const room = await getLiveRoomData(active.id, active.date);
      participants = room.participants;
      count = participants.length;
      onlineCount = participants.filter((p) => p.is_online).length;
    }

    return NextResponse.json({
      ...status,
      sessionDateLabel:
        status.sessionDateLabel ??
        (active ? formatDisplayDate(active.date) : null),
      usedDates,
      minSelectableDate: minSelectableSessionDate(),
      activeEndedAt: active?.ended_at ?? null,
      participants,
      count,
      onlineCount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "讀取管理狀態失敗" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = verifyAdminRequest(request);
  if (!auth.ok) {
    const { status, body } = adminAuthErrorResponse(auth);
    return NextResponse.json(body, { status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未設定" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = (body as { action?: string }).action;

    if (action === "setup-schema") {
      await ensureSessionsLiveSchema();
      return NextResponse.json({ ok: true, schemaReady: true });
    }

    if (action === "start") {
      const date = String((body as { date?: string }).date ?? "").trim();
      const session = await startLiveSession(date);
      return NextResponse.json({
        ok: true,
        sessionId: session.id,
        sessionDate: session.date,
        sessionDateLabel: formatDisplayDate(session.date),
        phase: "active" as const,
      });
    }

    if (action === "end") {
      const session = await endActiveLiveSession();
      return NextResponse.json({
        ok: true,
        sessionId: session.id,
        sessionDate: session.date,
        sessionDateLabel: formatDisplayDate(session.date),
        phase: "idle" as const,
        endedAt: session.ended_at,
      });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (e) {
    console.error(e);
    const message =
      e instanceof Error && e.message ? e.message : "操作失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
