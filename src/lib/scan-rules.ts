import {
  countCompletedTofuSets,
  countTofuProgressScans,
  isLegacyTofuScan,
  isTofuProgressToken,
  tofuProgressScanBlockMessage,
} from "@/lib/tofu-progress";

const TOPPING_TOKEN_IDS = new Set([
  "redbean",
  "mungbean",
  "peanut",
  "tapioca",
  "taro",
]);

/** 配料中文簡稱（與活動文案一致） */
const TOPPING_ZH_SHORT: Record<string, string> = {
  redbean: "紅豆",
  mungbean: "綠豆",
  taro: "芋圓",
  tapioca: "粉圓",
  peanut: "花生",
};

export function toppingZhShortName(tokenType: string): string {
  return TOPPING_ZH_SHORT[tokenType] ?? tokenType;
}

export function sameToppingCooldownMessage(tokenType: string): string {
  return `您剛剛才領過${toppingZhShortName(tokenType)}配料呢客人!`;
}

export const SCAN_TOPPING_COOLDOWN_MS = 60_000;
const START_TOKEN_ID = "start";

export type ScanHistoryRow = {
  token_type: string;
  scanned_at: string;
};

function isToppingToken(tokenType: string): boolean {
  return TOPPING_TOKEN_IDS.has(tokenType);
}

function validateTofuProgressScan(
  scansNewestFirst: ScanHistoryRow[],
  nextTokenType: string
): string | null {
  const earnedTypes = scansNewestFirst.map((s) => s.token_type);
  const completeSets = countCompletedTofuSets(earnedTypes);
  const perStep = countTofuProgressScans(earnedTypes);
  const alreadyInCurrentRound = (perStep.get(nextTokenType) ?? 0) > completeSets;
  if (alreadyInCurrentRound) {
    return tofuProgressScanBlockMessage(nextTokenType);
  }
  return null;
}

/**
 * 掃描防刷規則（回傳中文錯誤訊息；通過則回傳 null）
 * - 豆花：tofu-01…06 各站本輪僅能掃一次；可連續掃不同站
 * - 配料：同一種 1 分鐘內不可重掃
 */
export function validateScanRules(
  scansNewestFirst: ScanHistoryRow[],
  nextTokenType: string
): string | null {
  const now = Date.now();

  if (nextTokenType === START_TOKEN_ID) {
    const hasStart = scansNewestFirst.some((s) => s.token_type === START_TOKEN_ID);
    return hasStart ? "活動起點只能記錄一次" : null;
  }

  if (isLegacyTofuScan(nextTokenType)) {
    return "請改掃豆花起點 QR（tofu-01 至 tofu-06）";
  }

  if (isTofuProgressToken(nextTokenType)) {
    return validateTofuProgressScan(scansNewestFirst, nextTokenType);
  }

  if (isToppingToken(nextTokenType)) {
    const lastSameTopping = scansNewestFirst.find(
      (s) => s.token_type === nextTokenType
    );
    if (lastSameTopping) {
      const elapsed =
        now - new Date(lastSameTopping.scanned_at).getTime();
      if (elapsed < SCAN_TOPPING_COOLDOWN_MS) {
        return sameToppingCooldownMessage(nextTokenType);
      }
    }
    return null;
  }

  return null;
}
