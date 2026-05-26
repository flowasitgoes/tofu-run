import {
  BASE_TOFU_TOKEN_ID,
  PURE_DOUHUA_GOAL,
  TOFU_TYPES,
  TOKEN_TYPES,
} from "@/lib/constants";
import type { TofuTypeId } from "@/lib/constants";

export type CollectTarget = {
  id: string;
  label: string;
  zone: string;
  tokenLabel: string;
};

function getBaseTofuCollectTarget(): CollectTarget {
  const token = TOKEN_TYPES.find((t) => t.id === BASE_TOFU_TOKEN_ID)!;
  return {
    id: BASE_TOFU_TOKEN_ID,
    label: "豆花",
    zone: token.zone,
    tokenLabel: token.label,
  };
}

/** 從目標豆花名稱還原配料 id（例：紅豆綠豆花生豆花） */
function toppingIdsFromGoal(goal: string): string[] {
  let rest = goal.replace(/豆花$/, "").trim();
  if (!rest) return [];

  const byNameLen = [...TOFU_TYPES].sort(
    (a, b) => b.shortName.length - a.shortName.length
  );
  const ids: string[] = [];

  while (rest.length > 0) {
    const match = byNameLen.find((t) => rest.startsWith(t.shortName));
    if (!match) break;
    ids.push(match.id);
    rest = rest.slice(match.shortName.length);
  }

  return ids;
}

export function collectTargetsFromSignup(
  goal: string | null,
  topping1: string | null,
  topping2: string | null,
  topping3: string | null
): CollectTarget[] {
  const base = getBaseTofuCollectTarget();

  if (!goal || goal === PURE_DOUHUA_GOAL) {
    return [base];
  }

  let ids = [topping1, topping2, topping3].filter(Boolean) as string[];
  if (ids.length === 0) {
    ids = toppingIdsFromGoal(goal);
  }

  const toppingTargets = ids.map((id) => {
    const tofu = TOFU_TYPES.find((t) => t.id === id);
    const token = TOKEN_TYPES.find((t) => t.id === id);
    return {
      id,
      label: tofu?.shortName ?? id,
      zone: token?.zone ?? "",
      tokenLabel: token?.label ?? `${id} Token`,
    };
  });

  return [base, ...toppingTargets];
}

export function isValidToppingId(id: string): id is TofuTypeId {
  return TOFU_TYPES.some((t) => t.id === id);
}
