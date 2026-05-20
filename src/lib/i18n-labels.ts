import { createTranslator, type Locale } from "@/i18n";
import {
  MAX_TOPPING_PICKS,
  TOFU_TYPES,
  TOKEN_TYPES,
  type TofuTypeId,
  type TokenTypeId,
} from "@/lib/constants";

export { MAX_TOPPING_PICKS };

export function formatDouhuaGoalLocalized(
  toppingIds: string[],
  pureOnly: boolean,
  locale: Locale
): string {
  const t = createTranslator(locale);
  if (pureOnly) return t("toppings.pureDouhua");

  const names = toppingIds
    .map((id) => {
      if (!TOFU_TYPES.some((x) => x.id === id)) return "";
      return t(`toppings.${id as TofuTypeId}.short`);
    })
    .filter(Boolean);

  if (names.length === 0) return "";

  if (locale === "en") {
    return `${names.join(" ")}${t("toppings.douhuaSuffix")}`;
  }
  return `${names.join("")}${t("toppings.douhuaSuffix")}`;
}

export function getTofuLabelLocalized(
  id: string | null | undefined,
  locale: Locale
): string {
  const t = createTranslator(locale);
  const found = TOFU_TYPES.find((x) => x.id === id);
  if (!found) return t("tokens.unassigned");
  return t(`toppings.${found.id}.label`);
}

export function getTofuShortLocalized(id: TofuTypeId, locale: Locale): string {
  return createTranslator(locale)(`toppings.${id}.short`);
}

export function getTokenLabelLocalized(id: string, locale: Locale): string {
  const found = TOKEN_TYPES.find((x) => x.id === id);
  if (!found) return id;
  return createTranslator(locale)(`tokens.${found.id as TokenTypeId}.label`);
}

export function getTokenZoneLocalized(id: TokenTypeId, locale: Locale): string {
  return createTranslator(locale)(`tokens.${id}.zone`);
}

export function getGatheringSlots(locale: Locale) {
  const t = createTranslator(locale);
  return [
    {
      time: t("gathering.slot1.time"),
      mood: t("gathering.slot1.mood"),
    },
    {
      time: t("gathering.slot2.time"),
      mood: t("gathering.slot2.mood"),
    },
  ] as const;
}
