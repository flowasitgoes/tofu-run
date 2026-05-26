import { BASE_TOFU_TOKEN_ID } from "@/lib/constants";

const TOPPING_TOKEN_IDS = new Set([
  "redbean",
  "mungbean",
  "peanut",
  "tapioca",
  "taro",
]);

/** 配料中文簡稱（與活動文案一致；tapioca 對外稱珍珠） */
const TOPPING_ZH_SHORT: Record<string, string> = {
  redbean: "紅豆",
  mungbean: "綠豆",
  taro: "芋圓",
  tapioca: "珍珠",
  peanut: "花生",
};

export function toppingZhShortName(tokenType: string): string {
  return TOPPING_ZH_SHORT[tokenType] ?? tokenType;
}

export function sameToppingConsecutiveMessage(tokenType: string): string {
  return `您已經剛領過${toppingZhShortName(tokenType)}配料了!`;
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
 * 1. 同一配料不可連續掃（上一筆須為其他配料或豆花）
 * 2. 豆花：距上次豆花掃描須滿 40 秒
 * 3. 配料：距上次任一配料掃描須滿 1 分鐘
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
    const lastScan = scansNewestFirst[0];
    if (
      lastScan &&
      isToppingToken(lastScan.token_type) &&
      lastScan.token_type === nextTokenType
    ) {
      return sameToppingConsecutiveMessage(nextTokenType);
    }

    const lastTopping = scansNewestFirst.find((s) => isToppingToken(s.token_type));
    if (lastTopping) {
      const elapsed = now - new Date(lastTopping.scanned_at).getTime();
      if (elapsed < SCAN_TOPPING_COOLDOWN_MS) {
        return "配料 Token 需間隔 1 分鐘後才能再掃";
      }
    }
    return null;
  }

  return null;
}
