import { NextResponse } from "next/server";
import {
  getGoingSignupByRunnerId,
  getOrCreateTodaySession,
  getRecentUserSessionTokenScans,
  getUserById,
  getUserSessionForToday,
  recordToken,
} from "@/lib/db";
import { validateScanRules } from "@/lib/scan-rules";
import { TOKEN_TYPES } from "@/lib/constants";
import { collectTargetsFromSignup } from "@/lib/toppings";
import { isSupabaseConfigured } from "@/lib/supabase";

const VALID_TOKENS = TOKEN_TYPES.map((t) => t.id);

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未設定" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { userId, tokenType, lat, lng } = body as {
      userId?: string;
      tokenType?: string;
      lat?: number | null;
      lng?: number | null;
    };

    if (!userId || !tokenType) {
      return NextResponse.json({ error: "缺少參數" }, { status: 400 });
    }

    if (!VALID_TOKENS.includes(tokenType as (typeof VALID_TOKENS)[number])) {
      return NextResponse.json({ error: "無效的 Token" }, { status: 400 });
    }

    const session = await getOrCreateTodaySession();
    const userSession = await getUserSessionForToday(userId, session.id);

    if (!userSession) {
      return NextResponse.json(
        { error: "請先加入今日活動" },
        { status: 403 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
    }

    const signup = await getGoingSignupByRunnerId(user.runner_id);
    const targets = collectTargetsFromSignup(
      signup?.goal ?? null,
      signup?.topping1 ?? null,
      signup?.topping2 ?? null,
      signup?.topping3 ?? null
    );

    if (!targets.some((t) => t.id === tokenType)) {
      return NextResponse.json(
        { error: "此 Token 不在你的豆花路線" },
        { status: 403 }
      );
    }

    const recentScans = await getRecentUserSessionTokenScans(
      userId,
      session.id
    );
    const scanBlock = validateScanRules(recentScans, tokenType);
    if (scanBlock) {
      return NextResponse.json({ error: scanBlock }, { status: 429 });
    }

    const token = await recordToken(
      userId,
      session.id,
      tokenType,
      lat ?? null,
      lng ?? null
    );

    return NextResponse.json({
      ok: true,
      token,
      sessionId: session.id,
      scannedAt: token.scanned_at,
    });
  } catch (e) {
    console.error(e);
    const message =
      e instanceof Error && e.message ? e.message : "掃描失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
