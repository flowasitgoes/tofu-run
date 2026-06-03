"use client";

import { useCallback, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  getTokenLabelLocalized,
  getTokenZoneLocalized,
} from "@/lib/i18n-labels";
import { STOP_MAP_SLIDES } from "@/lib/stop-map-slides";

/** 介於直式／橫式地圖之間的固定展示高度 */
const CAROUSEL_FRAME_H = "h-[228px] sm:h-[248px]";

export function StopMapCarousel() {
  const { locale, t } = useLocale();
  const total = STOP_MAP_SLIDES.length;
  const [index, setIndex] = useState(0);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + total) % total);
    },
    [total]
  );

  const slide = STOP_MAP_SLIDES[index];
  const label = getTokenLabelLocalized(slide.tokenId, locale);
  const zone = getTokenZoneLocalized(slide.tokenId, locale);

  return (
    <div className="mt-3">
      <p className="mb-2 text-center text-[11px] text-brown-sugar/55">
        {t("live.stopMapCarouselHint")}
      </p>
      <div
        className={`relative ${CAROUSEL_FRAME_H} overflow-hidden rounded-2xl border border-brown-sugar/10 shadow-sm`}
      >
        {/* 留白區補色：漸層 + 柔光 + 細點 */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-mung-green/12 via-cream to-sunset/18"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-brown-sugar/6 via-transparent to-tofu-white/40"
          aria-hidden
        />
        <div
          className="absolute -left-10 top-1/4 h-28 w-28 rounded-full bg-mung-green/15 blur-2xl"
          aria-hidden
        />
        <div
          className="absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-sunset/25 blur-2xl"
          aria-hidden
        />
        <div
          className="stop-map-carousel-dots absolute inset-0 opacity-[0.35]"
          aria-hidden
        />

        <div className="relative flex h-full w-full items-center justify-center px-10 py-3">
          <img
            key={slide.imageSrc}
            src={slide.imageSrc}
            alt={t("live.stopMapSlideAlt", { label, zone })}
            className="max-h-full max-w-full object-contain drop-shadow-md"
            loading="lazy"
          />
        </div>

        <button
          type="button"
          onClick={() => go(-1)}
          className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-brown-sugar/15 bg-cream/90 text-lg text-brown-sugar shadow-sm backdrop-blur-sm transition hover:bg-cream"
          aria-label={t("live.stopMapPrev")}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-brown-sugar/15 bg-cream/90 text-lg text-brown-sugar shadow-sm backdrop-blur-sm transition hover:bg-cream"
          aria-label={t("live.stopMapNext")}
        >
          ›
        </button>
      </div>
      <p className="mt-2 text-center text-sm font-semibold text-brown-sugar">
        {label}
      </p>
      <p className="text-center text-xs text-brown-sugar/60">{zone}</p>
      <div
        className="mt-2 flex flex-wrap items-center justify-center gap-1.5"
        role="tablist"
        aria-label={t("live.stopMapCarouselHint")}
      >
        {STOP_MAP_SLIDES.map((s, i) => {
          const dotLabel = getTokenLabelLocalized(s.tokenId, locale);
          return (
            <button
              key={s.tokenId}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={dotLabel}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index
                  ? "w-5 bg-mung-green"
                  : "w-2 bg-brown-sugar/25 hover:bg-brown-sugar/40"
              }`}
            />
          );
        })}
      </div>
      <p className="mt-1 text-center text-[10px] text-brown-sugar/45">
        {t("live.stopMapCounter", {
          current: String(index + 1),
          total: String(total),
        })}
      </p>
    </div>
  );
}
