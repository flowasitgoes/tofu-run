import { NextResponse } from "next/server";
import { getGoingSignupByRunnerId, getPoolUserByRunnerId } from "@/lib/db";
import { signupDisplayName } from "@/lib/displayName";
import { normalizeRunnerId, RUNNER_ID_PATTERN } from "@/lib/runner";
import {
  isSupabaseConfigured,
  isSupabaseServiceConfigured,
} from "@/lib/supabase";

/** 首頁「登入護照」：查名額是否存在、是否已完成想參加報名（有 Email） */
export async function GET(request: Request) {
  if (!isSupabaseConfigured() || !isSupabaseServiceConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未設定完整" },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const runnerId = normalizeRunnerId(searchParams.get("runnerId") ?? "");

    if (!runnerId) {
      return NextResponse.json(
        { error: "請提供 Runner ID" },
        { status: 400 }
      );
    }

    if (!RUNNER_ID_PATTERN.test(runnerId)) {
      return NextResponse.json(
        { error: "Runner ID 格式不正確（例：DOG-214）" },
        { status: 400 }
      );
    }

    const poolUser = await getPoolUserByRunnerId(runnerId);
    if (!poolUser) {
      return NextResponse.json(
        { error: "找不到此 Runner ID，請確認名額編號" },
        { status: 404 }
      );
    }

    const signup = await getGoingSignupByRunnerId(runnerId);
    const registered = Boolean(signup?.email?.trim());
    const nickname = registered && signup
      ? signupDisplayName(signup)
      : poolUser.runner_name;

    return NextResponse.json({
      runnerId: poolUser.runner_id,
      runnerName: nickname,
      nickname,
      registered,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "查詢失敗" }, { status: 500 });
  }
}
