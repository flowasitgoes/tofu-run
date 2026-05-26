import { BASE_TOFU_TOKEN_ID } from "@/lib/constants";
import { collectTargetsFromSignup } from "@/lib/toppings";
import {
  countCompletedTofuSets,
  firstTofuRelatedScanAt,
  isTofuProgressToken,
  TOFU_PROGRESS_TOKEN_IDS,
} from "@/lib/tofu-progress";

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

function effectiveCountForRequired(
  requiredId: string,
  toppingCounts: Map<string, number>,
  earnedTokenIds: string[]
): number {
  if (requiredId === BASE_TOFU_TOKEN_ID) {
    return countCompletedTofuSets(earnedTokenIds);
  }
  return toppingCounts.get(requiredId) ?? 0;
}

/** 集齊豆花（六站一輪）+ 個人配料後視為完成 */
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

export function routeMeetsCompletion(
  requiredIds: string[],
  earnedTokenIds: string[]
): boolean {
  return countCompletedBowls(requiredIds, earnedTokenIds) >= 1;
}

/** 已完成幾碗：豆花 = 六站各滿一輪；配料 = 各掃 N 次取最小 */
export function countCompletedBowls(
  requiredIds: string[],
  earnedTokenIds: string[]
): number {
  if (requiredIds.length === 0) return 0;

  const toppingCounts = countToppingScans(earnedTokenIds);
  let min = Infinity;
  for (const id of requiredIds) {
    min = Math.min(
      min,
      effectiveCountForRequired(id, toppingCounts, earnedTokenIds)
    );
  }
  return min === Infinity ? 0 : min;
}

function countToppingScans(earnedTokenIds: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of earnedTokenIds) {
    if (isTofuProgressToken(id) || id === BASE_TOFU_TOKEN_ID) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function tokenScanCounts(
  requiredIds: string[],
  earnedTokenIds: string[]
): Map<string, number> {
  const counts = new Map<string, number>();
  const toppingCounts = countToppingScans(earnedTokenIds);
  for (const id of requiredIds) {
    counts.set(
      id,
      effectiveCountForRequired(id, toppingCounts, earnedTokenIds)
    );
  }
  return counts;
}

function minBowlsFromMaps(
  requiredIds: string[],
  toppingCounts: Map<string, number>,
  progressCounts: Map<string, number>
): number {
  let min = Infinity;
  for (const rid of requiredIds) {
    let c: number;
    if (rid === BASE_TOFU_TOKEN_ID) {
      c = Infinity;
      for (const pid of TOFU_PROGRESS_TOKEN_IDS) {
        c = Math.min(c, progressCounts.get(pid) ?? 0);
      }
      if (c === Infinity) c = 0;
    } else {
      c = toppingCounts.get(rid) ?? 0;
    }
    min = Math.min(min, c);
  }
  return min === Infinity ? 0 : min;
}

/** 第 N 碗完成當下最後掃到的那顆所需 Token 時間 */
export function completionTimeForBowls(
  requiredIds: string[],
  scans: { token_type: string; scanned_at: string }[],
  bowlCount: number
): string | null {
  if (bowlCount <= 0 || requiredIds.length === 0) return null;

  const toppingCounts = new Map<string, number>();
  const progressCounts = new Map<string, number>();
  for (const id of TOFU_PROGRESS_TOKEN_IDS) progressCounts.set(id, 0);

  const ordered = [...scans].sort(
    (a, b) =>
      new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
  );

  for (const scan of ordered) {
    const id = scan.token_type;
    if (isTofuProgressToken(id)) {
      progressCounts.set(id, (progressCounts.get(id) ?? 0) + 1);
    } else if (id !== BASE_TOFU_TOKEN_ID) {
      toppingCounts.set(id, (toppingCounts.get(id) ?? 0) + 1);
    }
    if (minBowlsFromMaps(requiredIds, toppingCounts, progressCounts) >= bowlCount) {
      return scan.scanned_at;
    }
  }
  return null;
}

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
    startIso = firstTofuRelatedScanAt(scans);
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
  return firstTofuRelatedScanAt(scans);
}

export function lastBowlCompletedAt(
  requiredIds: string[],
  scans: { token_type: string; scanned_at: string }[],
  bowlCount: number
): string | null {
  if (bowlCount <= 0) return null;
  return completionTimeForBowls(requiredIds, scans, bowlCount);
}

export function computeRouteCompletionFromScans(
  requiredIds: string[],
  earnedTokenIds: string[],
  scans: { token_type: string; scanned_at: string }[]
): { isComplete: boolean; completedAt: string | null } {
  if (!routeMeetsCompletion(requiredIds, earnedTokenIds)) {
    return { isComplete: false, completedAt: null };
  }
  const completedAt = completionTimeForBowls(requiredIds, scans, 1);
  return { isComplete: true, completedAt };
}
