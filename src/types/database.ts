export type User = {
  id: string;
  runner_id: string;
  runner_name: string;
  slot_no: number | null;
  claimed_at: string | null;
  first_lat: number | null;
  first_lng: number | null;
  created_at: string;
};

export type Session = {
  id: string;
  date: string;
  started_at: string;
};

export type UserSession = {
  id: string;
  user_id: string;
  session_id: string;
  tofu_type: string | null;
  completed_at: string | null;
  joined_at: string;
  live_seen_at: string | null;
};

/** LIVE 房間：今日已進場參加者 */
export type LiveParticipant = {
  user_id: string;
  runner_id: string;
  display_name: string;
  goal: string | null;
  joined_at: string;
  is_online: boolean;
  /** 已領取 Token，依掃描時間先後排序（最多 6 個） */
  earned_token_ids: string[];
};

export type Token = {
  id: string;
  user_id: string;
  session_id: string | null;
  token_type: string;
  lat: number | null;
  lng: number | null;
  scanned_at: string;
};

/** LIVE Ground：單一參與者五格 Token 狀態 */
export type GroundParticipantRow = {
  user_id: string;
  runner_id: string;
  display_name: string;
  goal: string | null;
  joined_at: string;
  earned: Record<string, string | null>;
  /** 此人須掃的 Token（豆花 + 報名配料） */
  requiredTokenIds: string[];
  isComplete: boolean;
  completedAt: string | null;
};

export type GroundFeedItem = {
  id: string;
  user_id: string;
  runner_id: string;
  display_name: string;
  token_type: string;
  scanned_at: string;
};

export type LiveGroundPayload = {
  sessionId: string;
  sessionDate: string;
  sessionDateLabel: string;
  participants: GroundParticipantRow[];
  feed: GroundFeedItem[];
};

export type LobbyPlayer = {
  user_id: string;
  runner_id: string;
  runner_name: string;
  tofu_type: string | null;
  joined_at: string;
};

/** Lobby 想參加名單（going_signups） */
export type GoingJoinListEntry = {
  id: string;
  runner_id: string;
  nickname: string | null;
  runner_name: string | null;
  goal: string | null;
  created_at: string;
};

export type PassportRun = {
  session_date: string;
  tofu_type: string | null;
  completed_at: string | null;
  joined_at: string;
  tokens: Token[];
};

export type StoredPlayer = {
  userId: string;
  runnerId: string;
  runnerName: string;
};

export type GoingSignup = {
  id: string;
  email: string;
  runner_id: string | null;
  runner_name: string | null;
  custom_name: string | null;
  nickname: string | null;
  line_id: string | null;
  intent: string;
  topping1: string | null;
  topping2: string | null;
  topping3: string | null;
  goal: string | null;
  created_at: string;
};

export type PassportAccount = {
  signup: GoingSignup;
  collectTargets: {
    id: string;
    label: string;
    zone: string;
    tokenLabel: string;
  }[];
  user: User | null;
  runs: PassportRun[];
  /** 今日場次（Realtime / LIVE 用） */
  todaySessionId: string | null;
  joinedToday: boolean;
};
