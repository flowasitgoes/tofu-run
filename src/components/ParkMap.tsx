"use client";

import Image from "next/image";
import { useLocale } from "@/components/LocaleProvider";
import {
  TOKEN_TYPES,
  resolveTokenIconSize,
  type TokenTypeId,
} from "@/lib/constants";
import {
  getTokenLabelLocalized,
  getTokenZoneLocalized,
} from "@/lib/i18n-labels";

const TOFU_PIN = "left-[3%] top-[38%]";

const PIN_POSITIONS: Record<TokenTypeId, string> = {
  tofu: TOFU_PIN,
  "tofu-01": TOFU_PIN,
  "tofu-02": TOFU_PIN,
  "tofu-03": TOFU_PIN,
  "tofu-04": TOFU_PIN,
  "tofu-05": TOFU_PIN,
  "tofu-06": TOFU_PIN,
  redbean: "left-[12%] top-[11%]",
  mungbean: "right-[4%] top-[14%]",
  peanut: "left-[8%] bottom-[4%]",
  tapioca: "left-[44%] bottom-[6%]",
  taro: "right-[6%] bottom-[30%]",
};

const TOKEN_SIZE = 56;

export function ParkMap() {
  const { locale, t } = useLocale();

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border-2 border-brown-sugar/15 bg-gradient-to-b from-mung-green/20 via-tofu-white to-sunset/25 p-4 shadow-inner">
      <p className="text-center text-xs font-medium text-brown-sugar/60">
        {t("parkMap.title")}
      </p>

      <div className="absolute inset-4 rounded-2xl border border-dashed border-brown-sugar/20" />
      <div className="absolute left-[10%] top-[14%] h-16 w-20 rounded-full border border-blue-300/30 bg-blue-200/40" />
      <div className="absolute right-[6%] top-[16%] h-20 w-24 rounded-2xl border border-mung-green/30 bg-mung-green/25" />
      <div className="absolute bottom-[6%] left-[6%] h-12 w-20 rounded-2xl border border-mung-green/25 bg-mung-green/20" />
      <div className="absolute bottom-[8%] left-[38%] h-10 w-16 rounded-xl border border-sunset/20 bg-sunset/10" />
      <div className="absolute bottom-[28%] right-[8%] h-12 w-14 rounded-xl border border-brown-sugar/15 bg-tofu-white/80" />

      {TOKEN_TYPES.map((token) => (
        <div
          key={token.id}
          className={`absolute ${PIN_POSITIONS[token.id]} z-10 flex flex-col items-center`}
        >
          <div className="animate-float">
            <Image
              src={token.image}
              alt={getTokenLabelLocalized(token.id, locale)}
              width={TOKEN_SIZE}
              height={TOKEN_SIZE}
              className="h-14 w-14 object-contain drop-shadow-lg"
            />
          </div>
          <span className="mt-0.5 rounded-full bg-cream/90 px-2 py-0.5 text-[10px] font-medium text-brown-sugar shadow-sm">
            {getTokenZoneLocalized(token.id, locale)}
          </span>
        </div>
      ))}

      <div className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 animate-pulse-soft text-2xl">
        🥣
      </div>
    </div>
  );
}
