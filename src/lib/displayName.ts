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
  custom_name?: string | null;
  nickname?: string | null;
  runner_name?: string | null;
};

/** 護照／LIVE／Lobby：優先 custom_name（報名自訂），再 nickname，最後名額原名 */
export function signupDisplayName(
  signup: SignupNameFields | null | undefined
): string {
  if (!signup) return "—";
  const custom = signup.custom_name?.trim();
  if (custom) return custom;
  const nick = signup.nickname?.trim();
  if (nick) return nick;
  const pool = signup.runner_name?.trim();
  if (pool) return pool;
  return "—";
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
