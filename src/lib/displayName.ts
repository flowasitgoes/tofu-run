/** 有自訂暱稱用自訂暱稱，否則用名額池 runner_name */
export function resolveDisplayName(
  customName: string | null | undefined,
  runnerName: string | null | undefined
): string | null {
  const custom = customName?.trim();
  if (custom) return custom;
  const runner = runnerName?.trim();
  return runner || null;
}

type SignupNameFields = {
  nickname?: string | null;
  custom_name?: string | null;
  runner_name?: string | null;
};

/**
 * 護照／LIVE／首頁顯示名：一律讀 going_signups.nickname。
 * nickname 於報名時寫入（有 custom_name 用 custom_name，否則用名額 runner_name）。
 * 舊資料若 nickname 為空，再依 custom_name → runner_name 推算。
 */
export function signupDisplayName(
  signup: SignupNameFields | null | undefined
): string {
  const nick = signup?.nickname?.trim();
  if (nick) return nick;
  return resolveDisplayName(signup?.custom_name, signup?.runner_name) ?? "—";
}

export function signupPoolRunnerName(
  signup: SignupNameFields | null | undefined
): string | null {
  const pool = signup?.runner_name?.trim();
  return pool || null;
}

/** LIVE／Ground：報名顯示名，無則用 users.runner_name */
export function signupDisplayNameOrFallback(
  signup: SignupNameFields | null | undefined,
  fallback: string
): string {
  const name = signupDisplayName(signup);
  return name !== "—" ? name : fallback.trim() || "—";
}
