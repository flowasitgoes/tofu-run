import { NextResponse } from "next/server";
import { adminAuthErrorResponse, verifyAdminRequest } from "@/lib/admin-auth";
import { getLiveRoomData, getSessionById } from "@/lib/db";
import { formatDisplayDate } from "@/lib/session";
import { isSupabaseConfigured, isSupabaseServiceConfigured } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
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
    const { sessionId } = await params;
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "找不到此活動場次" }, { status: 404 });
    }

    const room = await getLiveRoomData(session.id, session.date);
    const participants = room.participants;

    return NextResponse.json({
      session,
      sessionDateLabel: formatDisplayDate(session.date),
      participants,
      count: participants.length,
      onlineCount: participants.filter((p) => p.is_online).length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "讀取活動快照失敗" }, { status: 500 });
  }
}
