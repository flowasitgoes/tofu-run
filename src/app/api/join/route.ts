import { NextResponse } from "next/server";
import {
  claimPoolUserByRunnerId,
  getGoingSignupByRunnerId,
  getUserByRunnerId,
  joinSession,
  requireActiveLiveSession,
} from "@/lib/db";
import { LiveNotActiveError, LIVE_NOT_ACTIVE_ERROR } from "@/lib/live-gate";
import { normalizeRunnerId, RUNNER_ID_PATTERN } from "@/lib/runner";
import {
  isSupabaseConfigured,
  isSupabaseServiceConfigured,
} from "@/lib/supabase";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isSupabaseServiceConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未設定完整" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { userId, runnerId: rawRunnerId, lat, lng } = body as {
      userId?: string;
      runnerId?: string;
      lat?: number | null;
      lng?: number | null;
    };

    const runnerId = rawRunnerId ? normalizeRunnerId(rawRunnerId) : "";

    if (!runnerId || !RUNNER_ID_PATTERN.test(runnerId)) {
      return NextResponse.json(
        { error: "請提供有效的 Runner ID" },
        { status: 400 }
      );
    }

    const signup = await getGoingSignupByRunnerId(runnerId);
    if (!signup) {
      return NextResponse.json(
        { error: "請先完成首頁「想參加」報名，才能加入今日活動" },
        { status: 403 }
      );
    }

    const session = await requireActiveLiveSession();

    if (userId) {
      const poolUser = await getUserByRunnerId(runnerId);
      if (!poolUser || poolUser.id !== userId) {
        return NextResponse.json({ error: "身份不符" }, { status: 403 });
      }
      const userSession = await joinSession(userId, session.id);
      return NextResponse.json({
        userId,
        runnerId: poolUser.runner_id,
        runnerName: signup.nickname ?? poolUser.runner_name,
        sessionId: session.id,
        userSessionId: userSession.id,
        rejoined: true,
      });
    }

    const user = await claimPoolUserByRunnerId(
      runnerId,
      lat ?? null,
      lng ?? null
    );

    if (!user) {
      return NextResponse.json(
        { error: "找不到此 Runner ID 的名額，請確認編號" },
        { status: 404 }
      );
    }

    const userSession = await joinSession(user.id, session.id);

    return NextResponse.json({
      userId: user.id,
      runnerId: user.runner_id,
      runnerName: signup.nickname ?? user.runner_name,
      slotNo: user.slot_no,
      sessionId: session.id,
      userSessionId: userSession.id,
    });
  } catch (e) {
    if (e instanceof LiveNotActiveError) {
      return NextResponse.json({ error: LIVE_NOT_ACTIVE_ERROR }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "加入失敗" },
      { status: 500 }
    );
  }
}
