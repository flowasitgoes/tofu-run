import { BASE_TOFU_TOKEN_ID, SCANNABLE_TOKEN_IDS, TOKEN_TYPES } from "@/lib/constants";
import {
  computeRouteCompletionFromScans,
  countCompletedBowls,
  lastBowlCompletedAt,
  requiredTokenIdsForGoal,
  activityDurationMinutes,
} from "@/lib/ground-completion";
import { createSupabaseClient, createSupabaseServiceClient } from "@/lib/supabase";
import { resolveEventSchedule } from "@/lib/event-schedule";
import { LiveNotActiveError } from "@/lib/live-gate";
import {
  isPastSessionDate,
  isValidSessionDateString,
  minSelectableSessionDate,
  parseLivePhase,
} from "@/lib/live-control";
import { signupDisplayNameOrFallback } from "@/lib/displayName";
import { ensureSessionsLiveSchema } from "@/lib/sessions-schema-setup";
import { formatDisplayDate, getTodayDateString } from "@/lib/session";
import { collectTargetsFromSignup } from "@/lib/toppings";
import type {
  GoingJoinListEntry,
  GoingSignup,
  GroundFeedItem,
  GroundParticipantRow,
  LiveGroundPayload,
  LiveParticipant,
  LobbyPlayer,
  PassportAccount,
  PassportRun,
  Session,
  Token,
  User,
  UserSession,
} from "@/types/database";

/** LIVE 在線：最後出現在 /live 的時間在此秒數內 */
/** 有心跳（/api/live/presence）時可涵蓋掃 Token 離開 LIVE 頁的時間 */
export const LIVE_ONLINE_SECONDS = 180;

/** 場次內計入的掃描類型（含舊版單一 tofu QR） */
function sessionTokenTypeSet(): Set<string> {
  return new Set([...SCANNABLE_TOKEN_IDS, BASE_TOFU_TOKEN_ID]);
}

function isRpcNotFound(error: { code?: string } | null): boolean {
  return error?.code === "PGRST202";
}

function isMissingColumn(
  error: { code?: string; message?: string } | null,
  column: string
): boolean {
  if (!error?.message?.includes(column)) return false;
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /does not exist/i.test(error.message)
  );
}

export async function getOrCreateTodaySession(): Promise<Session> {
  const supabase = createSupabaseClient();
  const today = getTodayDateString();

  const { data: existing } = await supabase
    .from("sessions")
    .select("*")
    .eq("date", today)
    .maybeSingle();

  if (existing) return existing as Session;

  const { data, error } = await supabase
    .from("sessions")
    .insert({ date: today })
    .select()
    .single();

  if (error) throw error;
  return data as Session;
}

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    date: row.date as string,
    started_at: row.started_at as string,
    status: (row.status as Session["status"]) ?? "closed",
    ended_at: (row.ended_at as string | null) ?? null,
  };
}

/** 目前進行中的 LIVE 場次（admin 開啟）；無則 null */
export async function getActiveLiveSession(): Promise<Session | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    if (isMissingColumn(error, "status")) return null;
    throw error;
  }
  if (!data) return null;
  return rowToSession(data as Record<string, unknown>);
}

export async function requireActiveLiveSession(): Promise<Session> {
  const session = await getActiveLiveSession();
  if (!session) throw new LiveNotActiveError();
  return session;
}

/** 已使用過的活動日（含進行中／已結束；一天僅能開一次） */
export async function listUsedSessionDates(): Promise<string[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("date")
    .order("date", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r) => r.date as string);
}

export async function getLiveStatusPayload(): Promise<{
  phase: "idle" | "active";
  sessionId: string | null;
  sessionDate: string | null;
  sessionDateLabel: string | null;
}> {
  const active = await getActiveLiveSession();
  if (!active) {
    return {
      phase: "idle",
      sessionId: null,
      sessionDate: null,
      sessionDateLabel: null,
    };
  }
  return {
    phase: "active",
    sessionId: active.id,
    sessionDate: active.date,
    sessionDateLabel: formatDisplayDate(active.date),
  };
}

export async function startLiveSession(date: string): Promise<Session> {
  await ensureSessionsLiveSchema();

  if (!isValidSessionDateString(date)) {
    throw new Error("活動日期格式不正確");
  }
  if (isPastSessionDate(date)) {
    throw new Error("不可選擇過去的日期");
  }

  const used = await listUsedSessionDates();
  if (used.includes(date)) {
    throw new Error("此日期已舉辦過活動，請選擇其他日期");
  }

  const active = await getActiveLiveSession();
  if (active) {
    throw new Error("已有進行中的活動，請先結束後再開啟");
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({ date, status: "active" })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("此日期已舉辦過活動，請選擇其他日期");
    }
    if (isMissingColumn(error, "status")) {
      await ensureSessionsLiveSchema();
      const retry = await supabase
        .from("sessions")
        .insert({ date, status: "active" })
        .select()
        .single();
      if (retry.error) throw retry.error;
      return rowToSession(retry.data as Record<string, unknown>);
    }
    throw error;
  }

  return rowToSession(data as Record<string, unknown>);
}

export async function endActiveLiveSession(): Promise<Session> {
  await ensureSessionsLiveSchema();
  const active = await getActiveLiveSession();
  if (!active) {
    throw new Error("目前沒有進行中的活動");
  }

  const supabase = createSupabaseClient();
  const endedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("sessions")
    .update({ status: "closed", ended_at: endedAt })
    .eq("id", active.id)
    .select()
    .single();

  if (error) throw error;
  return rowToSession(data as Record<string, unknown>);
}

export { minSelectableSessionDate, parseLivePhase };

/** 從 300 名額池領取下一個未使用的跑者（現場掃碼） */
export async function claimNextPoolUser(
  lat: number | null,
  lng: number | null
): Promise<User | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("claim_next_pool_user", {
    p_lat: lat,
    p_lng: lng,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as User) ?? null;
}

export async function getPoolStats(): Promise<{
  total: number;
  claimed: number;
  remaining: number;
}> {
  const supabase = createSupabaseClient();

  const { count: total, error: e1 } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .not("slot_no", "is", null);

  const { count: claimed, error: e2 } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .not("slot_no", "is", null)
    .not("claimed_at", "is", null);

  if (e1 || e2) throw e1 ?? e2;

  const t = total ?? 0;
  const c = claimed ?? 0;
  return { total: t, claimed: c, remaining: t - c };
}

/** 是否已完成「想參加」報名（僅伺服器 service role 查詢） */
export async function getGoingSignupByRunnerId(
  runnerId: string
): Promise<GoingSignup | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("going_signups")
    .select("*")
    .eq("runner_id", runnerId)
    .eq("intent", "join")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as GoingSignup) ?? null;
}

export async function hasGoingJoinSignup(runnerId: string): Promise<boolean> {
  const row = await getGoingSignupByRunnerId(runnerId);
  return row !== null;
}

/** 已完成想參加報名（有 Email）的 Runner ID，供首頁護照登入快取（不含 Email） */
export async function getPassportRegisteredRunnerIds(): Promise<string[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("going_signups")
    .select("runner_id, email")
    .eq("intent", "join")
    .not("runner_id", "is", null);

  if (error) throw error;

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (!row.email?.trim()) continue;
    const id = (row.runner_id as string).trim().toUpperCase();
    if (id) ids.add(id);
  }
  return [...ids];
}

/** Lobby：列出所有「想參加」報名（活動日前預熱用） */
export async function getGoingJoinList(): Promise<GoingJoinListEntry[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("going_signups")
    .select("id, runner_id, nickname, runner_name, custom_name, goal, created_at")
    .eq("intent", "join")
    .not("runner_id", "is", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as GoingJoinListEntry[];
}

export async function insertGoingSignup(row: {
  email: string;
  custom_name: string | null;
  nickname: string | null;
  line_id: string | null;
  runner_id: string | null;
  runner_name: string | null;
  intent: string;
  topping1: string | null;
  topping2: string | null;
  topping3: string | null;
  goal: string | null;
  preferred_toppings: string[];
  douhua_goal: string | null;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("going_signups").insert(row);
  if (error) throw error;
}

export async function getUserByRunnerId(runnerId: string): Promise<User | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("runner_id", runnerId)
    .not("slot_no", "is", null)
    .maybeSingle();

  if (error) throw error;
  return (data as User) ?? null;
}

/** 現場加入：領取該 runner_id 對應名額（須已存在 going_signups） */
export async function claimPoolUserByRunnerId(
  runnerId: string,
  lat: number | null,
  lng: number | null
): Promise<User | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("claim_pool_user_by_runner_id", {
    p_runner_id: runnerId,
    p_lat: lat,
    p_lng: lng,
  });

  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    return (row as User) ?? null;
  }

  if (!isRpcNotFound(error)) throw error;

  const existing = await getUserByRunnerId(runnerId);
  if (!existing) return null;

  const patch: Record<string, string | number> = {};
  if (!existing.claimed_at) {
    patch.claimed_at = new Date().toISOString();
  }
  if (lat != null && existing.first_lat == null) patch.first_lat = lat;
  if (lng != null && existing.first_lng == null) patch.first_lng = lng;

  if (Object.keys(patch).length === 0) return existing;

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update(patch)
    .eq("id", existing.id)
    .select()
    .single();

  if (updateError) throw updateError;
  return updated as User;
}

export async function getPassportAccount(
  runnerId: string
): Promise<PassportAccount | null> {
  const signup = await getGoingSignupByRunnerId(runnerId);
  if (!signup) return null;

  const user = await getUserByRunnerId(runnerId);
  const collectTargets = collectTargetsFromSignup(
    signup.goal,
    signup.topping1,
    signup.topping2,
    signup.topping3
  );

  const active = await getActiveLiveSession();

  if (!user) {
    return {
      signup,
      collectTargets,
      user: null,
      runs: [],
      todaySessionId: active?.id ?? null,
      joinedToday: false,
    };
  }

  const { runs } = await getPassportData(user.id, signup);
  const activeMembership = active
    ? await getUserSessionForToday(user.id, active.id)
    : null;

  return {
    signup,
    collectTargets,
    user,
    runs,
    todaySessionId: active?.id ?? null,
    joinedToday: activeMembership !== null,
  };
}

/** 依 Runner ID 查詢 300 名額池中的跑者 */
export async function getPoolUserByRunnerId(
  runnerId: string
): Promise<Pick<User, "runner_id" | "runner_name"> | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("runner_id, runner_name")
    .eq("runner_id", runnerId)
    .not("slot_no", "is", null)
    .maybeSingle();

  if (error) throw error;
  return data as Pick<User, "runner_id" | "runner_name"> | null;
}

export async function createUser(
  runnerId: string,
  runnerName: string,
  lat: number | null,
  lng: number | null
): Promise<User> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .insert({
      runner_id: runnerId,
      runner_name: runnerName,
      first_lat: lat,
      first_lng: lng,
    })
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

export async function getUserById(userId: string): Promise<User | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as User) ?? null;
}

function primaryTofuFromSignup(signup: GoingSignup | null): string | null {
  return signup?.topping1 ?? null;
}

/** 進入 LIVE：加入今日場次，並從報名同步 tofu_type（不依賴 /admin） */
export async function ensureUserSessionForLive(
  userId: string,
  sessionId: string,
  runnerId: string
): Promise<UserSession> {
  const supabase = createSupabaseClient();
  let row = await getUserSessionForToday(userId, sessionId);

  if (!row) {
    row = await joinSession(userId, sessionId);
  }

  if (row.tofu_type) return row;

  const signup = await getGoingSignupByRunnerId(runnerId);
  const primary = primaryTofuFromSignup(signup);
  if (!primary) return row;

  const { data, error } = await supabase
    .from("user_sessions")
    .update({ tofu_type: primary })
    .eq("id", row.id)
    .select()
    .single();

  if (error) throw error;
  return data as UserSession;
}

export async function joinSession(
  userId: string,
  sessionId: string
): Promise<UserSession> {
  const supabase = createSupabaseClient();

  const { data: existing } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) return existing as UserSession;

  const { data, error } = await supabase
    .from("user_sessions")
    .insert({ user_id: userId, session_id: sessionId })
    .select()
    .single();

  if (error) throw error;
  return data as UserSession;
}

export async function hasSessionToken(
  userId: string,
  sessionId: string,
  tokenType: string
): Promise<boolean> {
  const supabase = createSupabaseClient();

  let query = supabase
    .from("tokens")
    .select("id")
    .eq("user_id", userId)
    .eq("token_type", tokenType)
    .eq("session_id", sessionId)
    .limit(1);

  const { data, error } = await query.maybeSingle();

  if (error && isMissingColumn(error, "session_id")) {
    const session = await getOrCreateTodaySession();
    if (session.id !== sessionId) return false;
    const { data: legacy, error: legacyError } = await supabase
      .from("tokens")
      .select("id")
      .eq("user_id", userId)
      .eq("token_type", tokenType)
      .gte("scanned_at", `${session.date}T00:00:00`)
      .limit(1)
      .maybeSingle();
    if (legacyError) throw legacyError;
    return legacy !== null;
  }

  if (error) throw error;
  return data !== null;
}

export async function getLobbyPlayers(sessionId: string): Promise<LobbyPlayer[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("user_sessions")
    .select(
      `
      user_id,
      tofu_type,
      joined_at,
      users!inner (
        runner_id,
        runner_name
      )
    `
    )
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const user = row.users as unknown as {
      runner_id: string;
      runner_name: string;
    };
    return {
      user_id: row.user_id as string,
      runner_id: user.runner_id,
      runner_name: user.runner_name,
      tofu_type: row.tofu_type as string | null,
      joined_at: row.joined_at as string,
    };
  });
}

export async function getTakenTofuTypes(sessionId: string): Promise<string[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("user_sessions")
    .select("tofu_type")
    .eq("session_id", sessionId)
    .not("tofu_type", "is", null);

  if (error) throw error;
  return (data ?? [])
    .map((r) => r.tofu_type as string)
    .filter(Boolean);
}

export async function assignTofu(
  userSessionId: string,
  tofuType: string
): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("user_sessions")
    .update({ tofu_type: tofuType })
    .eq("id", userSessionId);

  if (error) throw error;
}

export async function completeSession(userSessionId: string): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("user_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", userSessionId);

  if (error) throw error;
}

/** 今日場次掃描紀錄（新→舊），供防刷規則判斷 */
export async function getRecentUserSessionTokenScans(
  userId: string,
  sessionId: string,
  limit = 30
): Promise<Pick<Token, "token_type" | "scanned_at">[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("tokens")
    .select("token_type, scanned_at")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("scanned_at", { ascending: false })
    .limit(limit);

  if (error && isMissingColumn(error, "session_id")) {
    const session = await getOrCreateTodaySession();
    if (session.id !== sessionId) return [];
    const { data: legacy, error: legacyError } = await supabase
      .from("tokens")
      .select("token_type, scanned_at")
      .eq("user_id", userId)
      .gte("scanned_at", `${session.date}T00:00:00`)
      .order("scanned_at", { ascending: false })
      .limit(limit);
    if (legacyError) throw legacyError;
    return (legacy ?? []) as Pick<Token, "token_type" | "scanned_at">[];
  }

  if (error) throw error;
  return (data ?? []) as Pick<Token, "token_type" | "scanned_at">[];
}

export async function recordToken(
  userId: string,
  sessionId: string,
  tokenType: string,
  lat: number | null,
  lng: number | null
): Promise<Token> {
  const supabase = createSupabaseClient();
  const row: Record<string, unknown> = {
    user_id: userId,
    session_id: sessionId,
    token_type: tokenType,
    lat,
    lng,
  };

  let { data, error } = await supabase.from("tokens").insert(row).select().single();

  if (error && isMissingColumn(error, "session_id")) {
    delete row.session_id;
    ({ data, error } = await supabase.from("tokens").insert(row).select().single());
  }

  if (error) {
    if (error.code === "23505") {
      throw new Error("你已經收集過此 Token");
    }
    throw error;
  }
  return data as Token;
}

const TOKEN_SCAN_SELECT = "id, user_id, token_type, scanned_at";

function nextCalendarDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
}

function mergeTokenRows(into: Map<string, Token>, rows: Token[] | null | undefined) {
  for (const row of rows ?? []) into.set(row.id, row);
}

/**
 * 今日場次 Token（Ground / LIVE 名單共用）
 * 合併：① 綁定 session_id ② 進場後掃描（跨日仍顯示）③ 當日曆日（session_id 為 null 的舊資料）
 */
async function fetchSessionTokenScans(
  sessionId: string,
  sessionDate: string,
  userIds: string[],
  sinceIso?: string | null,
  untilIso?: string | null
): Promise<Token[]> {
  if (!userIds.length) return [];

  const supabase = createSupabaseServiceClient();
  const byId = new Map<string, Token>();
  const anchor = sinceIso ?? `${sessionDate}T00:00:00`;
  const dayEnd = `${nextCalendarDate(sessionDate)}T00:00:00`;

  const withSession = await supabase
    .from("tokens")
    .select(TOKEN_SCAN_SELECT)
    .eq("session_id", sessionId)
    .in("user_id", userIds);

  if (withSession.error && isMissingColumn(withSession.error, "session_id")) {
    let legacyQuery = supabase
      .from("tokens")
      .select(TOKEN_SCAN_SELECT)
      .in("user_id", userIds)
      .gte("scanned_at", anchor);
    if (untilIso) {
      legacyQuery = legacyQuery.lt("scanned_at", untilIso);
    }
    const { data: legacy, error: legacyError } = await legacyQuery;
    if (legacyError) throw legacyError;
    return (legacy ?? []) as Token[];
  }

  if (withSession.error) throw withSession.error;
  mergeTokenRows(byId, (withSession.data ?? []) as Token[]);

  let bySinceQuery = supabase
    .from("tokens")
    .select(TOKEN_SCAN_SELECT)
    .in("user_id", userIds)
    .gte("scanned_at", anchor);
  if (untilIso) {
    bySinceQuery = bySinceQuery.lt("scanned_at", untilIso);
  }

  const [bySince, byDay] = await Promise.all([
    bySinceQuery,
    supabase
      .from("tokens")
      .select(TOKEN_SCAN_SELECT)
      .in("user_id", userIds)
      .gte("scanned_at", `${sessionDate}T00:00:00`)
      .lt("scanned_at", dayEnd),
  ]);

  if (bySince.error) throw bySince.error;
  if (byDay.error) throw byDay.error;
  mergeTokenRows(byId, (bySince.data ?? []) as Token[]);
  mergeTokenRows(byId, (byDay.data ?? []) as Token[]);

  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
  );
}

type GroundSessionRow = {
  user_id: string;
  runner_id: string;
  runner_name: string;
  joined_at: string;
};

async function fetchGroundSessionRows(
  sessionId: string
): Promise<GroundSessionRow[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("user_sessions")
    .select(
      `
      user_id,
      joined_at,
      users!inner (
        runner_id,
        runner_name
      )
    `
    )
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const user = row.users as unknown as {
      runner_id: string;
      runner_name: string;
    };
    return {
      user_id: row.user_id as string,
      runner_id: user.runner_id,
      runner_name: user.runner_name,
      joined_at: row.joined_at as string,
    };
  });
}

export async function getLiveGroundData(
  sessionId: string,
  sessionDate: string,
  sessionDateLabel: string
): Promise<LiveGroundPayload> {
  const tokenIds: string[] = TOKEN_TYPES.map((t) => t.id);
  const emptyEarned = (): Record<string, string | null> =>
    Object.fromEntries(tokenIds.map((id) => [id, null]));

  const sessionRows = await fetchGroundSessionRows(sessionId);
  if (sessionRows.length === 0) {
    return {
      sessionId,
      sessionDate,
      sessionDateLabel,
      participants: [],
      feed: [],
    };
  }

  const userIds = sessionRows.map((r) => r.user_id);
  const runnerIds = sessionRows.map((r) => r.runner_id);
  const sinceIso = sessionRows
    .map((r) => r.joined_at)
    .sort()[0]!;
  const supabase = createSupabaseServiceClient();

  const [tokenRows, signupResult] = await Promise.all([
    fetchSessionTokenScans(sessionId, sessionDate, userIds, sinceIso),
    supabase
      .from("going_signups")
      .select(
        "runner_id, nickname, runner_name, custom_name, goal, topping1, topping2, topping3"
      )
      .in("runner_id", runnerIds)
      .eq("intent", "join"),
  ]);

  if (signupResult.error) throw signupResult.error;

  const signupByRunner = new Map(
    (signupResult.data ?? []).map((s) => [s.runner_id as string, s])
  );

  const earnedByUser = new Map<string, Record<string, string | null>>();
  const earnedOrderByUser = new Map<string, string[]>();
  for (const row of sessionRows) {
    earnedByUser.set(row.user_id, emptyEarned());
    earnedOrderByUser.set(row.user_id, []);
  }

  const tokenRowsByScan = [...tokenRows].sort(
    (a, b) =>
      new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
  );

  for (const tok of tokenRowsByScan) {
    const earned = earnedByUser.get(tok.user_id);
    const order = earnedOrderByUser.get(tok.user_id);
    const type = String(tok.token_type);
    if (!earned || !order || !tokenIds.includes(type)) continue;
    if (!earned[type]) {
      earned[type] = tok.scanned_at;
    }
    if (order) {
      order.push(type);
    }
  }

  const runnerByUser = new Map(
    sessionRows.map((r) => [r.user_id, r.runner_id])
  );
  const nameByUser = new Map<string, string>();

  const rows: GroundParticipantRow[] = sessionRows.map((row) => {
    const signup = signupByRunner.get(row.runner_id);
    const displayName = signupDisplayNameOrFallback(signup, row.runner_name);
    nameByUser.set(row.user_id, displayName);

    const goal = (signup?.goal as string | null) ?? null;
    const earned = earnedByUser.get(row.user_id) ?? emptyEarned();
    const requiredTokenIds = signup
      ? requiredTokenIdsForGoal(
          goal,
          signup.topping1 as string | null,
          signup.topping2 as string | null,
          signup.topping3 as string | null
        )
      : requiredTokenIdsForGoal(null, null, null, null);
    const earnedTokenIds = earnedOrderByUser.get(row.user_id) ?? [];
    const userScans = tokenRows.filter((t) => t.user_id === row.user_id);
    const { isComplete, completedAt } = computeRouteCompletionFromScans(
      requiredTokenIds,
      earnedTokenIds,
      userScans
    );

    return {
      user_id: row.user_id,
      runner_id: row.runner_id,
      display_name: displayName,
      goal,
      joined_at: row.joined_at,
      earned,
      earned_token_ids: earnedTokenIds,
      requiredTokenIds,
      isComplete,
      completedAt,
    };
  });

  const feed = buildLiveSessionFeed(
    tokenRows,
    rows.map((r) => ({
      user_id: r.user_id,
      runner_id: r.runner_id,
      display_name: r.display_name,
      goal: r.goal,
      joined_at: r.joined_at,
      is_online: false,
      earned_token_ids: r.earned_token_ids,
      required_token_ids: r.requiredTokenIds,
      is_complete: r.isComplete,
      completed_at: r.completedAt,
    }))
  );

  return {
    sessionId,
    sessionDate,
    sessionDateLabel,
    participants: rows,
    feed,
  };
}

export async function getUserSessionForToday(
  userId: string,
  sessionId: string
): Promise<UserSession | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  return data as UserSession | null;
}

export async function getPassportData(
  userId: string,
  signup: GoingSignup | null = null
): Promise<{
  user: User;
  runs: PassportRun[];
}> {
  const supabase = createSupabaseClient();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError) throw userError;

  const { data: sessionRows, error: sessionsError } = await supabase
    .from("user_sessions")
    .select(
      `
      session_id,
      tofu_type,
      completed_at,
      joined_at,
      sessions!inner (date, ended_at)
    `
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  if (sessionsError) throw sessionsError;

  const requiredIds = signup
    ? requiredTokenIdsForGoal(
        signup.goal,
        signup.topping1,
        signup.topping2,
        signup.topping3
      )
    : [];

  const tokenTypeSet = sessionTokenTypeSet();

  const bySession = new Map<
    string,
    {
      sessionId: string;
      sessionDate: string;
      sessionEndedAt: string | null;
      joinedAt: string;
      completedAt: string | null;
      tofuType: string | null;
    }
  >();

  for (const row of sessionRows ?? []) {
    const session = row.sessions as unknown as {
      date: string;
      ended_at?: string | null;
    };
    const sessionId = row.session_id as string;
    const joinedAt = row.joined_at as string;
    const existing = bySession.get(sessionId);
    if (!existing) {
      bySession.set(sessionId, {
        sessionId,
        sessionDate: session.date,
        sessionEndedAt: session.ended_at ?? null,
        joinedAt,
        completedAt: row.completed_at as string | null,
        tofuType: row.tofu_type as string | null,
      });
      continue;
    }
    if (joinedAt < existing.joinedAt) existing.joinedAt = joinedAt;
    const completedAt = row.completed_at as string | null;
    if (
      completedAt &&
      (!existing.completedAt ||
        new Date(completedAt) > new Date(existing.completedAt))
    ) {
      existing.completedAt = completedAt;
    }
    if (!existing.tofuType && row.tofu_type) {
      existing.tofuType = row.tofu_type as string;
    }
  }

  const runs: PassportRun[] = [];

  const sessionTimeline = [...bySession.values()].sort(
    (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  );

  function sessionScanUntilIso(index: number): string | null {
    const meta = sessionTimeline[index];
    const nextJoin = sessionTimeline[index + 1]?.joinedAt ?? null;
    const endedAt = meta.sessionEndedAt;
    if (nextJoin && endedAt) {
      return new Date(nextJoin) < new Date(endedAt) ? nextJoin : endedAt;
    }
    return nextJoin ?? endedAt;
  }

  for (let i = 0; i < sessionTimeline.length; i++) {
    const meta = sessionTimeline[i];
    const tokenRows = await fetchSessionTokenScans(
      meta.sessionId,
      meta.sessionDate,
      [userId],
      meta.joinedAt,
      sessionScanUntilIso(i)
    );

    const earnedIds = [...tokenRows]
      .sort(
        (a, b) =>
          new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
      )
      .map((t) => String(t.token_type))
      .filter((id) => tokenTypeSet.has(id));

    const bowlsCompleted = countCompletedBowls(requiredIds, earnedIds);
    const schedule = resolveEventSchedule(meta.sessionDate);
    const lastBowlAt =
      bowlsCompleted > 0
        ? lastBowlCompletedAt(requiredIds, tokenRows, bowlsCompleted)
        : null;
    const durationMinutes = activityDurationMinutes(
      requiredIds,
      tokenRows,
      bowlsCompleted,
      schedule?.startAt ?? null
    );

    runs.push({
      session_date: meta.sessionDate,
      tofu_type: meta.tofuType,
      completed_at: lastBowlAt ?? meta.completedAt,
      joined_at: meta.joinedAt,
      tokens: tokenRows,
      bowls_completed: bowlsCompleted,
      required_token_ids: requiredIds,
      event_start_at: schedule?.startAt ?? null,
      event_end_at: schedule?.endAt ?? null,
      activity_duration_minutes: durationMinutes,
    });
  }

  runs.sort((a, b) => b.session_date.localeCompare(a.session_date));

  return { user: user as User, runs };
}

export async function findUserSessionRow(
  sessionId: string,
  userId: string
): Promise<UserSession & { runner_name: string; runner_id: string } | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("user_sessions")
    .select(
      `
      *,
      users!inner (runner_id, runner_name)
    `
    )
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const user = data.users as unknown as {
    runner_id: string;
    runner_name: string;
  };

  return {
    ...(data as UserSession),
    runner_id: user.runner_id,
    runner_name: user.runner_name,
  };
}

export async function getAdminLobbyRows(sessionId: string) {
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
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
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
}

export async function getTodaySessionMembership(
  runnerId: string,
  sessionId?: string
): Promise<{
  userId: string;
  sessionId: string;
  userSessionId: string;
} | null> {
  const resolvedSessionId =
    sessionId ?? (await getActiveLiveSession())?.id ?? null;
  if (!resolvedSessionId) return null;
  const user = await getUserByRunnerId(runnerId);
  if (!user) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("user_sessions")
    .select("id, user_id, session_id")
    .eq("user_id", user.id)
    .eq("session_id", resolvedSessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    userId: data.user_id as string,
    sessionId: data.session_id as string,
    userSessionId: data.id as string,
  };
}

export async function touchLiveSeen(
  userId: string,
  sessionId: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("user_sessions")
    .update({ live_seen_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("session_id", sessionId);

  if (!error) return;
  if (isMissingColumn(error, "live_seen_at")) return;
  throw error;
}

async function loadSessionTokenData(
  sessionId: string,
  userIds: string[],
  sessionDate: string,
  sinceIso?: string | null
): Promise<{
  earnedByUser: Map<string, string[]>;
  tokenRows: Token[];
}> {
  const earnedByUser = new Map<string, string[]>();
  if (!userIds.length) {
    return { earnedByUser, tokenRows: [] };
  }

  const tokenTypeSet = sessionTokenTypeSet();
  const earnedLists = new Map<string, string[]>();
  for (const id of userIds) earnedLists.set(id, []);

  const tokenRows = await fetchSessionTokenScans(
    sessionId,
    sessionDate,
    userIds,
    sinceIso
  );
  const byScanOrder = [...tokenRows].sort(
    (a, b) =>
      new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
  );

  for (const tok of byScanOrder) {
    const list = earnedLists.get(tok.user_id);
    const typeId = String(tok.token_type);
    if (!list || !tokenTypeSet.has(typeId)) continue;
    list.push(typeId);
  }

  for (const [userId, list] of earnedLists) {
    earnedByUser.set(userId, list);
  }
  return { earnedByUser, tokenRows };
}

export function buildLiveSessionFeed(
  tokenRows: Token[],
  participants: LiveParticipant[]
): GroundFeedItem[] {
  const runnerByUser = new Map(
    participants.map((p) => [p.user_id, p.runner_id])
  );
  const nameByUser = new Map(
    participants.map((p) => [p.user_id, p.display_name])
  );

  const newestFirst = [...tokenRows].sort(
    (a, b) =>
      new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
  );

  return newestFirst.slice(0, 30).map((tok) => ({
    id: tok.id,
    user_id: tok.user_id,
    runner_id: runnerByUser.get(tok.user_id) ?? "",
    display_name: nameByUser.get(tok.user_id) ?? "",
    token_type: tok.token_type,
    scanned_at: tok.scanned_at,
  }));
}

export type LiveRoomData = {
  participants: LiveParticipant[];
  feed: GroundFeedItem[];
};

export async function getLiveRoomData(
  sessionId: string,
  sessionDate: string = getTodayDateString()
): Promise<LiveRoomData> {
  const { participants, tokenRows } = await fetchLiveParticipantRows(
    sessionId,
    sessionDate
  );
  return {
    participants,
    feed: buildLiveSessionFeed(tokenRows, participants),
  };
}

async function fetchLiveParticipantRows(
  sessionId: string,
  sessionDate: string
): Promise<{ participants: LiveParticipant[]; tokenRows: Token[] }> {
  const supabase = createSupabaseServiceClient();

  const withLiveSelect = `
      user_id,
      joined_at,
      live_seen_at,
      users!inner (
        runner_id,
        runner_name
      )
    `;

  let rows: Record<string, unknown>[] | null = null;
  let trackLiveSeen = true;

  const primary = await supabase
    .from("user_sessions")
    .select(withLiveSelect)
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  if (primary.error && isMissingColumn(primary.error, "live_seen_at")) {
    trackLiveSeen = false;
    const fallback = await supabase
      .from("user_sessions")
      .select(
        `
      user_id,
      joined_at,
      users!inner (
        runner_id,
        runner_name
      )
    `
      )
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true });
    if (fallback.error) throw fallback.error;
    rows = (fallback.data ?? []) as Record<string, unknown>[];
  } else {
    if (primary.error) throw primary.error;
    rows = (primary.data ?? []) as Record<string, unknown>[];
  }

  if (!rows?.length) return { participants: [], tokenRows: [] };

  const userIds = rows.map((row) => row.user_id as string);
  const sinceIso = rows
    .map((row) => row.joined_at as string)
    .sort()[0];
  const { earnedByUser, tokenRows } = await loadSessionTokenData(
    sessionId,
    userIds,
    sessionDate,
    sinceIso
  );

  const runnerIds = rows.map((row) => {
    const user = row.users as unknown as { runner_id: string };
    return user.runner_id;
  });

  const tokenIds: string[] = TOKEN_TYPES.map((t) => t.id);
  const emptyEarned = (): Record<string, string | null> =>
    Object.fromEntries(tokenIds.map((id) => [id, null]));

  const earnedRecordsByUser = new Map<string, Record<string, string | null>>();
  for (const uid of userIds) earnedRecordsByUser.set(uid, emptyEarned());
  for (const tok of tokenRows) {
    const earned = earnedRecordsByUser.get(tok.user_id);
    const type = String(tok.token_type);
    if (earned && tokenIds.includes(type) && !earned[type]) {
      earned[type] = tok.scanned_at;
    }
  }

  const { data: signups, error: signupError } = await supabase
    .from("going_signups")
    .select(
      "runner_id, nickname, runner_name, custom_name, goal, topping1, topping2, topping3"
    )
    .in("runner_id", runnerIds)
    .eq("intent", "join");

  if (signupError) throw signupError;

  const signupByRunner = new Map(
    (signups ?? []).map((s) => [s.runner_id as string, s])
  );

  const onlineCutoff = Date.now() - LIVE_ONLINE_SECONDS * 1000;

  const participants = rows.map((row) => {
    const user = row.users as unknown as {
      runner_id: string;
      runner_name: string;
    };
    const signup = signupByRunner.get(user.runner_id);
    const displayName = signupDisplayNameOrFallback(signup, user.runner_name);
    const liveSeen = trackLiveSeen
      ? (row.live_seen_at as string | null)
      : null;
    const isOnline =
      trackLiveSeen && liveSeen
        ? new Date(liveSeen).getTime() > onlineCutoff
        : false;

    const goal = (signup?.goal as string | null) ?? null;
    const earned =
      earnedRecordsByUser.get(row.user_id as string) ?? emptyEarned();
    const requiredTokenIds = signup
      ? requiredTokenIdsForGoal(
          goal,
          signup.topping1 as string | null,
          signup.topping2 as string | null,
          signup.topping3 as string | null
        )
      : requiredTokenIdsForGoal(null, null, null, null);
    const earnedTokenIds = earnedByUser.get(row.user_id as string) ?? [];
    const userScans = tokenRows.filter((t) => t.user_id === row.user_id);
    const { isComplete, completedAt } = computeRouteCompletionFromScans(
      requiredTokenIds,
      earnedTokenIds,
      userScans
    );

    return {
      user_id: row.user_id as string,
      runner_id: user.runner_id,
      display_name: displayName,
      goal,
      joined_at: row.joined_at as string,
      is_online: isOnline,
      earned_token_ids: earnedTokenIds,
      required_token_ids: requiredTokenIds,
      is_complete: isComplete,
      completed_at: completedAt,
    };
  });

  return { participants, tokenRows };
}

export async function getLiveParticipants(
  sessionId: string,
  sessionDate: string = getTodayDateString()
): Promise<LiveParticipant[]> {
  const { participants } = await getLiveRoomData(sessionId, sessionDate);
  return participants;
}
