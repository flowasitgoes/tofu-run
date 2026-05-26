import { BASE_TOFU_TOKEN_ID } from "@/lib/constants";

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

/** 同一種配料 1 分鐘內重掃 */
export function sameToppingCooldownMessage(tokenType: string): string {
  return `您剛剛才領過${toppingZhShortName(tokenType)}配料呢客人!`;
}

export const SCAN_TOFU_COOLDOWN_MS = 40_000;
export const SCAN_TOPPING_COOLDOWN_MS = 60_000;

export type ScanHistoryRow = {
  token_type: string;
  scanned_at: string;
};

function isTofuToken(tokenType: string): boolean {
  return tokenType === BASE_TOFU_TOKEN_ID;
}

function isToppingToken(tokenType: string): boolean {
  return TOPPING_TOKEN_IDS.has(tokenType);
}

/**
 * 掃描防刷規則（回傳中文錯誤訊息；通過則回傳 null）
 * 1. 豆花：距上次豆花掃描須滿 40 秒
 * 2. 配料：距上次「同一種」配料掃描須滿 1 分鐘（不同配料可連續掃）
 */
export function validateScanRules(
  scansNewestFirst: ScanHistoryRow[],
  nextTokenType: string
): string | null {
  const now = Date.now();

  if (isTofuToken(nextTokenType)) {
    const lastTofu = scansNewestFirst.find((s) => isTofuToken(s.token_type));
    if (lastTofu) {
      const elapsed = now - new Date(lastTofu.scanned_at).getTime();
      if (elapsed < SCAN_TOFU_COOLDOWN_MS) {
        return "您才剛領過豆花噎ㄝ , 客人!";
      }
    }
    return null;
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
