import { BASE_TOFU_TOKEN_ID } from "@/lib/constants";
import { collectTargetsFromSignup } from "@/lib/toppings";

export function requiredTokenIdsForGoal(
  goal: string | null,
  topping1: string | null,
  topping2: string | null,
  topping3: string | null
): string[] {
  return collectTargetsFromSignup(goal, topping1, topping2, topping3).map(
    (t) => t.id
  );
}

/** 集齊豆花 + 個人配料後視為完成；完成時間 = 最後一顆所需 Token 的掃描時間 */
export function computeGroundCompletion(
  requiredIds: string[],
  earned: Record<string, string | null>
): { isComplete: boolean; completedAt: string | null } {
  if (requiredIds.length === 0) {
    return { isComplete: false, completedAt: null };
  }

  let completedAt: string | null = null;

  for (const id of requiredIds) {
    const at = earned[id];
    if (!at) {
      return { isComplete: false, completedAt: null };
    }
    if (!completedAt || new Date(at) > new Date(completedAt)) {
      completedAt = at;
    }
  }

  return { isComplete: true, completedAt };
}

/** 已完成幾碗：路線上每種 Token 各掃滿 N 次算 N 碗（取各類掃描次數最小值） */
export function countCompletedBowls(
  requiredIds: string[],
  earnedTokenIds: string[]
): number {
  if (requiredIds.length === 0) return 0;

  const counts = tokenScanCounts(requiredIds, earnedTokenIds);
  let min = Infinity;
  for (const id of requiredIds) {
    min = Math.min(min, counts.get(id) ?? 0);
  }
  return min === Infinity ? 0 : min;
}

export function tokenScanCounts(
  requiredIds: string[],
  earnedTokenIds: string[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of requiredIds) counts.set(id, 0);
  for (const id of earnedTokenIds) {
    if (!counts.has(id)) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** 第 N 碗完成當下最後掃到的那顆所需 Token 時間（與 LIVE 碗數邏輯一致） */
export function completionTimeForBowls(
  requiredIds: string[],
  scans: { token_type: string; scanned_at: string }[],
  bowlCount: number
): string | null {
  if (bowlCount <= 0 || requiredIds.length === 0) return null;

  const counts = new Map<string, number>();
  for (const id of requiredIds) counts.set(id, 0);

  const ordered = [...scans].sort(
    (a, b) =>
      new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
  );

  for (const scan of ordered) {
    const id = scan.token_type;
    if (!counts.has(id)) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    let min = Infinity;
    for (const rid of requiredIds) {
      min = Math.min(min, counts.get(rid) ?? 0);
    }
    if (min >= bowlCount) return scan.scanned_at;
  }
  return null;
}

/**
 * 活動時長（分鐘）：最後一碗集齊 − 起算點
 * - 有官方活動開始時間 → 從活動開始算
 * - 否則（過渡）→ 第一顆豆花 Token
 */
export function activityDurationMinutes(
  requiredIds: string[],
  scans: { token_type: string; scanned_at: string }[],
  bowlCount: number,
  eventStartAt?: string | null
): number | null {
  if (bowlCount <= 0) return null;

  const lastBowlAt = completionTimeForBowls(requiredIds, scans, bowlCount);
  if (!lastBowlAt) return null;

  let startIso: string | null = eventStartAt?.trim() || null;
  if (!startIso) {
    const ordered = [...scans].sort(
      (a, b) =>
        new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
    );
    startIso =
      ordered.find((s) => s.token_type === BASE_TOFU_TOKEN_ID)?.scanned_at ??
      null;
  }
  if (!startIso) return null;

  const start = new Date(startIso).getTime();
  const end = new Date(lastBowlAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;

  return Math.round((end - start) / 60000);
}

export function firstTofuScanAt(
  scans: { token_type: string; scanned_at: string }[]
): string | null {
  const ordered = [...scans].sort(
    (a, b) =>
      new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
  );
  return (
    ordered.find((s) => s.token_type === BASE_TOFU_TOKEN_ID)?.scanned_at ?? null
  );
}

export function lastBowlCompletedAt(
  requiredIds: string[],
  scans: { token_type: string; scanned_at: string }[],
  bowlCount: number
): string | null {
  if (bowlCount <= 0) return null;
  return completionTimeForBowls(requiredIds, scans, bowlCount);
}
