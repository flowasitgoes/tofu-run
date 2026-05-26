import { NextResponse } from "next/server";
import {
  claimPoolUserByRunnerId,
  ensureUserSessionForLive,
  getGoingSignupByRunnerId,
  getUserByRunnerId,
  requireActiveLiveSession,
  touchLiveSeen,
} from "@/lib/db";
import { LiveNotActiveError, LIVE_NOT_ACTIVE_ERROR } from "@/lib/live-gate";
import { signupDisplayName } from "@/lib/displayName";
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
        { error: "請輸入有效的 Runner ID" },
        { status: 400 }
      );
    }

    const signup = await getGoingSignupByRunnerId(runnerId);
    if (!signup) {
      return NextResponse.json(
        { error: "請先完成首頁「想參加」報名，才能進入 LIVE" },
        { status: 403 }
      );
    }

    const session = await requireActiveLiveSession();

    if (userId) {
      const poolUser = await getUserByRunnerId(runnerId);
      if (!poolUser || poolUser.id !== userId) {
        return NextResponse.json({ error: "身份不符" }, { status: 403 });
      }
      await ensureUserSessionForLive(userId, session.id, runnerId);
      await touchLiveSeen(userId, session.id);
      return NextResponse.json({
        userId,
        runnerId: poolUser.runner_id,
        runnerName: signupDisplayName(signup),
        sessionId: session.id,
        sessionDate: session.date,
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

    await ensureUserSessionForLive(user.id, session.id, runnerId);
    await touchLiveSeen(user.id, session.id);

    return NextResponse.json({
      userId: user.id,
      runnerId: user.runner_id,
      runnerName: signupDisplayName(signup),
      slotNo: user.slot_no,
      sessionId: session.id,
      sessionDate: session.date,
    });
  } catch (e) {
    if (e instanceof LiveNotActiveError) {
      return NextResponse.json({ error: LIVE_NOT_ACTIVE_ERROR }, { status: 403 });
    }
    console.error(e);
    const message =
      e instanceof Error && e.message ? e.message : "進入 LIVE 失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
