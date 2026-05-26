import { NextResponse } from "next/server";
import { getPassportRegisteredRunnerIds } from "@/lib/db";
import {
  isSupabaseConfigured,
  isSupabaseServiceConfigured,
} from "@/lib/supabase";

/** 首頁預載：已填 Email 的 Runner ID 清單（不含個資欄位） */
export async function GET() {
  if (!isSupabaseConfigured() || !isSupabaseServiceConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未設定完整" },
      { status: 503 }
    );
  }

  try {
    const runnerIds = await getPassportRegisteredRunnerIds();
    return NextResponse.json(
      { runnerIds },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "讀取名單失敗" }, { status: 500 });
  }
}
