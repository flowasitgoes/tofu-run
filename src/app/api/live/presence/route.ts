import { NextResponse } from "next/server";
import {
  getTodaySessionMembership,
  touchLiveSeen,
} from "@/lib/db";
import { normalizeRunnerId, RUNNER_ID_PATTERN } from "@/lib/runner";
import {
  isSupabaseConfigured,
  isSupabaseServiceConfigured,
} from "@/lib/supabase";

/**
 * 輕量心跳：掃 Token / Ground 時維持「在線」。
 * 目前前端 useLivePresence 已停用，此 API 保留供日後啟用。
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isSupabaseServiceConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未設定完整" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const runnerId = normalizeRunnerId(
      (body as { runnerId?: string }).runnerId ?? ""
    );

    if (!runnerId || !RUNNER_ID_PATTERN.test(runnerId)) {
      return NextResponse.json(
        { error: "請提供有效的 Runner ID" },
        { status: 400 }
      );
    }

    const membership = await getTodaySessionMembership(runnerId);
    if (!membership) {
      return NextResponse.json(
        { error: "請先進入 LIVE" },
        { status: 403 }
      );
    }

    await touchLiveSeen(membership.userId, membership.sessionId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "心跳失敗" }, { status: 500 });
  }
}
