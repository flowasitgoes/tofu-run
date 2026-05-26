import { NextResponse } from "next/server";
import {
  assignTofu,
  completeSession,
  getActiveLiveSession,
  getTakenTofuTypes,
} from "@/lib/db";
import { adminAuthErrorResponse, verifyAdminRequest } from "@/lib/admin-auth";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = verifyAdminRequest(request);
  if (!auth.ok) {
    const { status, body } = adminAuthErrorResponse(auth);
    return NextResponse.json(body, { status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未設定" },
      { status: 503 }
    );
  }

  try {
    const session = await getActiveLiveSession();
    if (!session) {
      return NextResponse.json({
        sessionDate: null,
        players: [],
        taken: [],
        liveInactive: true,
      });
    }
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("user_sessions")
      .select(
        `
        id,
        user_id,
        tofu_type,
        completed_at,
        joined_at,
        users!inner (runner_id, runner_name)
      `
      )
      .eq("session_id", session.id)
      .order("joined_at", { ascending: true });

    if (error) throw error;

    const taken = await getTakenTofuTypes(session.id);

    const players = (data ?? []).map((row) => {
      const user = row.users as unknown as {
        runner_id: string;
        runner_name: string;
      };
      return {
        id: row.id as string,
        user_id: row.user_id as string,
        runner_id: user.runner_id,
        runner_name: user.runner_name,
        tofu_type: row.tofu_type as string | null,
        completed_at: row.completed_at as string | null,
        joined_at: row.joined_at as string,
      };
    });

    return NextResponse.json({
      sessionDate: session.date,
      sessionId: session.id,
      players,
      takenTofuTypes: taken,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "讀取失敗" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = verifyAdminRequest(request);
  if (!auth.ok) {
    const { status, body } = adminAuthErrorResponse(auth);
    return NextResponse.json(body, { status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未設定" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { userSessionId, tofuType, action } = body as {
      userSessionId?: string;
      tofuType?: string;
      action?: "assign" | "complete" | "clear";
    };

    if (!userSessionId) {
      return NextResponse.json({ error: "缺少參數" }, { status: 400 });
    }

    const session = await getActiveLiveSession();
    if (!session) {
      return NextResponse.json(
        { error: "請先開啟活動後再分配豆花" },
        { status: 403 }
      );
    }
    const taken = await getTakenTofuTypes(session.id);

    if (action === "complete") {
      await completeSession(userSessionId);
      return NextResponse.json({ ok: true });
    }

    if (action === "clear") {
      const supabase = createSupabaseClient();
      await supabase
        .from("user_sessions")
        .update({ tofu_type: null, completed_at: null })
        .eq("id", userSessionId);
      return NextResponse.json({ ok: true });
    }

    if (!tofuType) {
      return NextResponse.json({ error: "請選擇豆花" }, { status: 400 });
    }

    const supabase = createSupabaseClient();
    const { data: row } = await supabase
      .from("user_sessions")
      .select("tofu_type")
      .eq("id", userSessionId)
      .single();

    if (
      taken.includes(tofuType) &&
      row?.tofu_type !== tofuType
    ) {
      return NextResponse.json(
        { error: "此豆花已被其他玩家選走" },
        { status: 409 }
      );
    }

    await assignTofu(userSessionId, tofuType);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}
