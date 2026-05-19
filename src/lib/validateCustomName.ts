import { PROFANITY_TERMS } from "@/lib/profanity-words";

export const CUSTOM_NAME_MAX_GRAPHEMES = 10;

/** 僅允許中文、英文、半形空格（不含數字與標點） */
const ALLOWED_PATTERN = /^[\p{Script=Han}a-zA-Z ]+$/u;
const ALLOWED_CHAR_PATTERN = /[\p{Script=Han}a-zA-Z ]/gu;

export type CustomNameValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

function getSegmenter(): Intl.Segmenter {
  return new Intl.Segmenter("zh-Hant", { granularity: "grapheme" });
}

/** 依使用者可見字元計數（中英文各算 1） */
export function countGraphemes(text: string): number {
  if (!text) return 0;
  return [...getSegmenter().segment(text)].length;
}

export function truncateGraphemes(text: string, max: number): string {
  if (!text || max <= 0) return "";
  const segments = [...getSegmenter().segment(text)].map((s) => s.segment);
  return segments.slice(0, max).join("");
}

/** 輸入框即時過濾：僅保留中文、英文、空格，並截斷至上限 */
export function sanitizeCustomNameInput(raw: string): string {
  const allowed = raw.match(ALLOWED_CHAR_PATTERN)?.join("") ?? "";
  return truncateGraphemes(allowed, CUSTOM_NAME_MAX_GRAPHEMES);
}

function normalizeForProfanity(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/ /g, "");
}

function containsProfanity(text: string): boolean {
  const normalized = normalizeForProfanity(text);
  return PROFANITY_TERMS.some((term) =>
    normalized.includes(normalizeForProfanity(term))
  );
}

export function validateCustomName(
  input: string | null | undefined
): CustomNameValidationResult {
  const trimmed = (input ?? "").trim();

  if (!trimmed) {
    return { ok: true, value: "" };
  }

  if (!ALLOWED_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: "暱稱僅能使用中文字、英文字母與空格，不可含數字或標點",
    };
  }

  if (countGraphemes(trimmed) > CUSTOM_NAME_MAX_GRAPHEMES) {
    return {
      ok: false,
      error: `自訂暱稱最多 ${CUSTOM_NAME_MAX_GRAPHEMES} 個字`,
    };
  }

  if (containsProfanity(trimmed)) {
    return { ok: false, error: "暱稱含有不適當用字，請修改" };
  }

  return { ok: true, value: trimmed };
}
