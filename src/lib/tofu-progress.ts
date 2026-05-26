import {
  BASE_TOFU_TOKEN_ID,
  TOFU_PROGRESS_COUNT,
  TOFU_PROGRESS_TOKEN_IDS,
  type TofuProgressTokenId,
} from "@/lib/constants";

export {
  TOFU_PROGRESS_COUNT,
  TOFU_PROGRESS_TOKEN_IDS,
  type TofuProgressTokenId,
};

const TOFU_PROGRESS_SET = new Set<string>(TOFU_PROGRESS_TOKEN_IDS);

export function isTofuProgressToken(
  tokenType: string
): tokenType is TofuProgressTokenId {
  return TOFU_PROGRESS_SET.has(tokenType);
}

/** 0 = 最左（tofu-01）… 5 = 最右（tofu-06） */
export function tofuProgressSlot(tokenType: string): number | null {
  const idx = TOFU_PROGRESS_TOKEN_IDS.indexOf(tokenType as TofuProgressTokenId);
  return idx >= 0 ? idx : null;
}

export function isTokenAllowedOnRoute(
  tokenType: string,
  requiredIds: string[]
): boolean {
  if (isTofuProgressToken(tokenType)) {
    return requiredIds.includes(BASE_TOFU_TOKEN_ID);
  }
  return requiredIds.includes(tokenType);
}

export function countTofuProgressScans(
  earnedTokenIds: string[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of TOFU_PROGRESS_TOKEN_IDS) counts.set(id, 0);
  for (const id of earnedTokenIds) {
    if (!isTofuProgressToken(id)) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** 已完成的「整顆豆花」碗數：六站各掃 N 次 → 取最小 N */
export function countCompletedTofuSets(earnedTokenIds: string[]): number {
  const perStep = countTofuProgressScans(earnedTokenIds);
  let min = Infinity;
  for (const id of TOFU_PROGRESS_TOKEN_IDS) {
    min = Math.min(min, perStep.get(id) ?? 0);
  }
  return min === Infinity ? 0 : min;
}

export function tofuProgressFilledSlots(earnedTokenIds: string[]): boolean[] {
  const completeSets = countCompletedTofuSets(earnedTokenIds);
  const perStep = countTofuProgressScans(earnedTokenIds);
  return TOFU_PROGRESS_TOKEN_IDS.map((id) => (perStep.get(id) ?? 0) > completeSets);
}

export function tofuProgressScanBlockMessage(tokenType: string): string {
  const slot = tofuProgressSlot(tokenType);
  const n = slot != null ? slot + 1 : "?";
  return `您已經掃過豆花第 ${n} 站了!`;
}

export function isLegacyTofuScan(tokenType: string): boolean {
  return tokenType === BASE_TOFU_TOKEN_ID;
}

export function firstTofuRelatedScanAt(
  scans: { token_type: string; scanned_at: string }[]
): string | null {
  const ordered = [...scans].sort(
    (a, b) =>
      new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
  );
  const hit = ordered.find(
    (s) => isTofuProgressToken(s.token_type) || isLegacyTofuScan(s.token_type)
  );
  return hit?.scanned_at ?? null;
}
