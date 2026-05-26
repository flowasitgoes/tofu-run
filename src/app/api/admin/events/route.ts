import { NextResponse } from "next/server";
import { adminAuthErrorResponse, verifyAdminRequest } from "@/lib/admin-auth";
import { listAdminSessions } from "@/lib/db";
import { isSupabaseConfigured, isSupabaseServiceConfigured } from "@/lib/supabase";

/**
 * 暫時需求：開發期間可檢視 active 場次（如 2026/06/01 尚未結束）
 * 上線後若要改回「僅 closed」，將此值改為 false。
 */
const INCLUDE_ACTIVE_FOR_DEV = true;

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
    const sessions = await listAdminSessions({
      includeActive: INCLUDE_ACTIVE_FOR_DEV,
    });
    return NextResponse.json({
      sessions,
      includeActiveForDev: INCLUDE_ACTIVE_FOR_DEV,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "讀取活動清單失敗" }, { status: 500 });
  }
}
