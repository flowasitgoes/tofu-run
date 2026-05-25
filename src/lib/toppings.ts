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

  const ids = [topping1, topping2, topping3].filter(Boolean) as string[];

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
