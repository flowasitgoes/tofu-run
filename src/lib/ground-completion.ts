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
