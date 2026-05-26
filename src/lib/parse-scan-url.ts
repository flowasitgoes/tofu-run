import {
  BASE_TOFU_TOKEN_ID,
  SCANNABLE_TOKEN_IDS,
} from "@/lib/constants";

const VALID = new Set<string>([
  ...SCANNABLE_TOKEN_IDS,
  BASE_TOFU_TOKEN_ID,
]);

/** 將 QR 內常見的全形／長破折號統一成 ASCII `-` */
function normalizeScanTokenId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-");
}

function isValidTokenId(id: string): boolean {
  return VALID.has(id);
}

/** 從 QR 內容解析 checkpoint token（完整網址、路徑或純 id） */
export function parseTokenTypeFromScanText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  let pathname = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      pathname = url.pathname;
    } catch {
      return null;
    }
  }

  const pathMatch = pathname.match(/(?:^|\/)scan\/([a-z0-9_-]+)\/?$/i);
  if (pathMatch) {
    const id = normalizeScanTokenId(pathMatch[1]);
    return isValidTokenId(id) ? id : null;
  }

  const bare = normalizeScanTokenId(trimmed);
  if (isValidTokenId(bare)) return bare;

  return null;
}
