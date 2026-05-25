import { TOKEN_TYPES } from "@/lib/constants";
import { createSupabaseClient, createSupabaseServiceClient } from "@/lib/supabase";
import { getTodayDateString } from "@/lib/session";
import {
  computeGroundCompletion,
  requiredTokenIdsForGoal,
} from "@/lib/ground-completion";
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

/** Lobby：列出所有「想參加」報名（活動日前預熱用） */
export async function getGoingJoinList(): Promise<GoingJoinListEntry[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("going_signups")
    .select("id, runner_id, nickname, runner_name, goal, created_at")
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

  if (!user) {
    const session = await getOrCreateTodaySession();
    return {
      signup,
      collectTargets,
      user: null,
      runs: [],
      todaySessionId: session.id,
      joinedToday: false,
    };
  }

  const { runs } = await getPassportData(user.id);
  const session = await getOrCreateTodaySession();
  const todayMembership = await getUserSessionForToday(user.id, session.id);

  return {
    signup,
    collectTargets,
    user,
    runs,
    todaySessionId: session.id,
    joinedToday: todayMembership !== null,
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

export async function getLiveGroundData(
  sessionId: string,
  sessionDate: string,
  sessionDateLabel: string
): Promise<LiveGroundPayload> {
  const participants = await getLiveParticipants(sessionId);
  const tokenIds: string[] = TOKEN_TYPES.map((t) => t.id);
  const emptyEarned = (): Record<string, string | null> =>
    Object.fromEntries(tokenIds.map((id) => [id, null]));

  if (participants.length === 0) {
    return {
      sessionId,
      sessionDate,
      sessionDateLabel,
      participants: [],
      feed: [],
    };
  }

  const supabase = createSupabaseServiceClient();
  const userIds = participants.map((p) => p.user_id);

  let tokenRows: Token[] = [];
  const withSession = await supabase
    .from("tokens")
    .select("*")
    .eq("session_id", sessionId)
    .in("user_id", userIds)
    .order("scanned_at", { ascending: false });

  if (withSession.error && isMissingColumn(withSession.error, "session_id")) {
    const { data: legacy, error: legacyError } = await supabase
      .from("tokens")
      .select("*")
      .in("user_id", userIds)
      .gte("scanned_at", `${sessionDate}T00:00:00`)
      .order("scanned_at", { ascending: false });
    if (legacyError) throw legacyError;
    tokenRows = (legacy ?? []) as Token[];
  } else {
    if (withSession.error) throw withSession.error;
    tokenRows = (withSession.data ?? []) as Token[];
  }

  const earnedByUser = new Map<string, Record<string, string | null>>();
  for (const p of participants) {
    earnedByUser.set(p.user_id, emptyEarned());
  }

  for (const tok of tokenRows) {
    const earned = earnedByUser.get(tok.user_id);
    if (!earned || !tokenIds.includes(tok.token_type)) continue;
    if (!earned[tok.token_type]) {
      earned[tok.token_type] = tok.scanned_at;
    }
  }

  const runnerIds = participants.map((p) => p.runner_id);
  const { data: signupRows, error: signupError } = await supabase
    .from("going_signups")
    .select("runner_id, goal, topping1, topping2, topping3")
    .in("runner_id", runnerIds)
    .eq("intent", "join");

  if (signupError) throw signupError;

  const signupByRunner = new Map(
    (signupRows ?? []).map((s) => [s.runner_id as string, s])
  );

  const runnerByUser = new Map(
    participants.map((p) => [p.user_id, p.runner_id])
  );
  const nameByUser = new Map(
    participants.map((p) => [p.user_id, p.display_name])
  );

  const rows: GroundParticipantRow[] = participants.map((p) => {
    const earned = earnedByUser.get(p.user_id) ?? emptyEarned();
    const signup = signupByRunner.get(p.runner_id);
    const requiredTokenIds = signup
      ? requiredTokenIdsForGoal(
          signup.goal as string | null,
          signup.topping1 as string | null,
          signup.topping2 as string | null,
          signup.topping3 as string | null
        )
      : requiredTokenIdsForGoal(p.goal, null, null, null);
    const { isComplete, completedAt } = computeGroundCompletion(
      requiredTokenIds,
      earned
    );

    return {
      user_id: p.user_id,
      runner_id: p.runner_id,
      display_name: p.display_name,
      goal: p.goal,
      joined_at: p.joined_at,
      earned,
      requiredTokenIds,
      isComplete,
      completedAt,
    };
  });

  const feed: GroundFeedItem[] = tokenRows.slice(0, 30).map((tok) => ({
    id: tok.id,
    user_id: tok.user_id,
    runner_id: runnerByUser.get(tok.user_id) ?? "",
    display_name: nameByUser.get(tok.user_id) ?? "",
    token_type: tok.token_type,
    scanned_at: tok.scanned_at,
  }));

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

export async function getPassportData(userId: string): Promise<{
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

  const { data: sessions, error: sessionsError } = await supabase
    .from("user_sessions")
    .select(
      `
      tofu_type,
      completed_at,
      joined_at,
      sessions!inner (date)
    `
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  if (sessionsError) throw sessionsError;

  const { data: tokens, error: tokensError } = await supabase
    .from("tokens")
    .select("*")
    .eq("user_id", userId)
    .order("scanned_at", { ascending: true });

  if (tokensError) throw tokensError;

  const allTokens = (tokens ?? []) as Token[];

  const runs: PassportRun[] = (sessions ?? []).map((s) => {
    const session = s.sessions as unknown as { date: string };
    const joinedAt = s.joined_at as string;
    const completedAt = s.completed_at as string | null;

    const runTokens = allTokens.filter((t) => {
      const scanned = new Date(t.scanned_at).getTime();
      const start = new Date(joinedAt).getTime();
      const end = completedAt
        ? new Date(completedAt).getTime()
        : scanned + 86400000;
      return scanned >= start && scanned <= end;
    });

    return {
      session_date: session.date,
      tofu_type: s.tofu_type as string | null,
      completed_at: completedAt,
      joined_at: joinedAt,
      tokens: runTokens,
    };
  });

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
  runnerId: string
): Promise<{
  userId: string;
  sessionId: string;
  userSessionId: string;
} | null> {
  const session = await getOrCreateTodaySession();
  const user = await getUserByRunnerId(runnerId);
  if (!user) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("user_sessions")
    .select("id, user_id, session_id")
    .eq("user_id", user.id)
    .eq("session_id", session.id)
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

async function getSessionEarnedTokenIdsByUser(
  sessionId: string,
  userIds: string[]
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (!userIds.length) return result;

  const supabase = createSupabaseServiceClient();
  const tokenTypeSet = new Set<string>(TOKEN_TYPES.map((t) => t.id));
  const earnedLists = new Map<string, string[]>();
  for (const id of userIds) earnedLists.set(id, []);

  const { data: sessionRow } = await supabase
    .from("sessions")
    .select("date")
    .eq("id", sessionId)
    .maybeSingle();
  const sessionDate =
    (sessionRow?.date as string | undefined) ?? getTodayDateString();

  let tokenRows: Token[] = [];
  const withSession = await supabase
    .from("tokens")
    .select("user_id, token_type, scanned_at")
    .eq("session_id", sessionId)
    .in("user_id", userIds)
    .order("scanned_at", { ascending: true });

  if (withSession.error && isMissingColumn(withSession.error, "session_id")) {
    const { data: legacy, error: legacyError } = await supabase
      .from("tokens")
      .select("user_id, token_type, scanned_at")
      .in("user_id", userIds)
      .gte("scanned_at", `${sessionDate}T00:00:00`)
      .order("scanned_at", { ascending: true });
    if (legacyError) throw legacyError;
    tokenRows = (legacy ?? []) as Token[];
  } else {
    if (withSession.error) throw withSession.error;
    tokenRows = (withSession.data ?? []) as Token[];
  }

  for (const tok of tokenRows) {
    const list = earnedLists.get(tok.user_id);
    const type = tok.token_type;
    const typeId = String(type);
    if (!list || !tokenTypeSet.has(typeId) || list.includes(typeId)) continue;
    list.push(typeId);
  }

  for (const [userId, list] of earnedLists) {
    result.set(userId, list);
  }
  return result;
}

export async function getLiveParticipants(
  sessionId: string
): Promise<LiveParticipant[]> {
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

  if (!rows?.length) return [];

  const userIds = rows.map((row) => row.user_id as string);
  const earnedByUser = await getSessionEarnedTokenIdsByUser(sessionId, userIds);

  const runnerIds = rows.map((row) => {
    const user = row.users as unknown as { runner_id: string };
    return user.runner_id;
  });

  const { data: signups, error: signupError } = await supabase
    .from("going_signups")
    .select("runner_id, nickname, runner_name, goal")
    .in("runner_id", runnerIds)
    .eq("intent", "join");

  if (signupError) throw signupError;

  const signupByRunner = new Map(
    (signups ?? []).map((s) => [s.runner_id as string, s])
  );

  const onlineCutoff = Date.now() - LIVE_ONLINE_SECONDS * 1000;

  return rows.map((row) => {
    const user = row.users as unknown as {
      runner_id: string;
      runner_name: string;
    };
    const signup = signupByRunner.get(user.runner_id);
    const displayName =
      (signup?.nickname as string | undefined)?.trim() ||
      (signup?.runner_name as string | undefined)?.trim() ||
      user.runner_name;
    const liveSeen = trackLiveSeen
      ? (row.live_seen_at as string | null)
      : null;
    const isOnline =
      trackLiveSeen && liveSeen
        ? new Date(liveSeen).getTime() > onlineCutoff
        : false;

    return {
      user_id: row.user_id as string,
      runner_id: user.runner_id,
      display_name: displayName,
      goal: (signup?.goal as string | null) ?? null,
      joined_at: row.joined_at as string,
      is_online: isOnline,
      earned_token_ids: earnedByUser.get(row.user_id as string) ?? [],
    };
  });
}
