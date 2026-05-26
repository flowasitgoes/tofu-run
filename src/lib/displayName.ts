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
  runner_name?: string | null;
};

/**
 * 護照／LIVE 顯示名：有自訂名稱用 custom_name，否則用名額原名 runner_name。
 * （與報名寫入 nickname 的規則一致，不依賴 nickname 欄位讀取。）
 */
export function signupDisplayName(
  signup: SignupNameFields | null | undefined
): string {
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
