import { TOKEN_TYPES } from "@/lib/constants";

const VALID = new Set<string>(TOKEN_TYPES.map((t) => t.id));

/** 從 QR 內容解析 /scan/{token}（支援完整網址或路徑） */
export function parseTokenTypeFromScanText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  let pathname = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      pathname = new URL(trimmed).pathname;
    } catch {
      return null;
    }
  }

  const match = pathname.match(/\/scan\/([a-z0-9_-]+)\/?$/i);
  if (!match) return null;

  const id = match[1].toLowerCase();
  return VALID.has(id) ? id : null;
}
