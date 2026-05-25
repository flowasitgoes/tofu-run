import { NextResponse } from "next/server";

/** Ground API 暫停使用；原實作見檔案底部註解 */
export async function GET() {
  return NextResponse.json(
    { error: "Ground 看板暫停使用" },
    { status: 503 }
  );
}

/*
import { NextResponse } from "next/server";
import {
  getLiveGroundData,
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

  try {
    const session = await getOrCreateTodaySession();

    if (runnerId && RUNNER_ID_PATTERN.test(runnerId)) {
      const membership = await getTodaySessionMembership(runnerId, session.id);
      if (membership) {
        await touchLiveSeen(membership.userId, membership.sessionId);
      }
    }

    const payload = await getLiveGroundData(
      session.id,
      session.date,
      formatDisplayDate(session.date)
    );

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error(e);
    const hint =
      e &&
      typeof e === "object" &&
      "message" in e &&
      typeof (e as { message: string }).message === "string" &&
      (e as { message: string }).message.includes("session_id")
        ? "請在 Supabase 執行 supabase/add_tokens_session_id.sql"
        : undefined;
    return NextResponse.json(
      { error: "讀取 Ground 失敗", hint },
      { status: 500 }
    );
  }
}
*/
