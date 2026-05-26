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

const TOFU_PIN = "right-[5%] bottom-[4%]";

const PIN_POSITIONS: Record<TokenTypeId, string> = {
  tofu: TOFU_PIN,
  "tofu-01": TOFU_PIN,
  "tofu-02": TOFU_PIN,
  "tofu-03": TOFU_PIN,
  "tofu-04": TOFU_PIN,
  "tofu-05": TOFU_PIN,
  "tofu-06": TOFU_PIN,
  redbean: "left-[12%] top-[11%]",
  mungbean: "right-[4%] top-[7%]",
  peanut: "left-[8%] bottom-[14%]",
  tapioca: "left-[44%] bottom-[6%]",
  taro: "right-[6%] bottom-[40%]",
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
      <div className="absolute left-[10%] top-[14%] h-16 w-20 rounded-full border border-red-bean/30 bg-red-bean/25" />
      <div className="absolute right-[6%] top-[9%] h-20 w-24 rounded-2xl border border-mung-green/30 bg-mung-green/25" />
      <div className="absolute bottom-[14%] left-[6%] h-12 w-20 rounded-2xl border border-mung-green/25 bg-mung-green/20" />
      <div className="absolute bottom-[12%] left-[42%] h-10 w-16 rounded-xl border border-brown-sugar/25 bg-brown-sugar/30" />
      <div className="absolute bottom-[38%] right-[8%] h-12 w-14 rounded-xl border border-twilight/30 bg-twilight/25" />
      <div className="absolute bottom-[4%] right-[6%] h-12 w-14 rounded-xl border border-brown-sugar/15 bg-tofu-white/80" />

      {TOKEN_TYPES.map((token) => {
        const isTaro = token.id === "taro";
        const isPeanut = token.id === "peanut";
        const iconPx = isPeanut ? 64 : TOKEN_SIZE;
        return (
        <div
          key={token.id}
          className={`absolute ${PIN_POSITIONS[token.id]} z-10 flex flex-col items-center`}
        >
          <div
            className={`animate-float ${isTaro ? "translate-y-2.5" : ""} ${isPeanut ? "translate-y-1.5" : ""}`}
          >
            <Image
              src={token.image}
              alt={getTokenLabelLocalized(token.id, locale)}
              width={iconPx}
              height={iconPx}
              className={`object-contain drop-shadow-lg ${isPeanut ? "h-16 w-16" : "h-14 w-14"}`}
            />
          </div>
          <span className="mt-0.5 rounded-full bg-cream/90 px-2 py-0.5 text-[10px] font-medium text-brown-sugar shadow-sm">
            {getTokenZoneLocalized(token.id, locale)}
          </span>
        </div>
      );
      })}

      <div className="absolute left-[57%] top-[43%] z-0 -translate-x-1/2 -translate-y-1/2 animate-pulse-soft text-2xl">
        🥣
      </div>
    </div>
  );
}
