/** 一般名額 DOG-214；第 301 名額等可用 311-MPH（數字在前） */
export const RUNNER_ID_PATTERN =
  /^(?:[A-Z]{2,4}-\d{3}|\d{3}-[A-Z]{2,4})$/;

export function normalizeRunnerId(raw: string): string {
  return raw.trim().toUpperCase();
}
