import { NextResponse } from "next/server";
import {
  getLiveRoomData,
  getOrCreateTodaySession,
  getTodaySessionMembership,
  touchLiveSeen,
} from "@/lib/db";
import { normalizeRunnerId, RUNNER_ID_PATTERN } from "@/lib/runner";
import { formatDisplayDate } from "@/lib/session";
import {
  isSupabaseConfigured,
  isSupabaseServiceConfigured,
} from "@/lib/supabase";

export async function GET(request: Request) {
  if (!isSupabaseConfigured() || !isSupabaseServiceConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未設定完整" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const runnerId = normalizeRunnerId(searchParams.get("runnerId") ?? "");

  if (!runnerId || !RUNNER_ID_PATTERN.test(runnerId)) {
    return NextResponse.json(
      { error: "請提供有效的 Runner ID" },
      { status: 400 }
    );
  }

  try {
    const session = await getOrCreateTodaySession();
    const membership = await getTodaySessionMembership(runnerId, session.id);
    if (!membership) {
      return NextResponse.json(
        { error: "請先輸入 Runner ID 進入 LIVE" },
        { status: 403 }
      );
    }

    await touchLiveSeen(membership.userId, membership.sessionId);

    const { participants, feed } = await getLiveRoomData(session.id, session.date);
    const onlineCount = participants.filter((p) => p.is_online).length;

    return NextResponse.json(
      {
        sessionDate: session.date,
        sessionDateLabel: formatDisplayDate(session.date),
        sessionId: session.id,
        count: participants.length,
        onlineCount,
        participants,
        feed,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "讀取 LIVE 失敗" },
      { status: 500 }
    );
  }
}
