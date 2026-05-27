"use client";

import Image from "next/image";
import { MadeByCredit } from "@/components/MadeByCredit";
import { InterestSignup } from "@/components/InterestSignup";
import { PageShell } from "@/components/PageShell";
import { ParkMap } from "@/components/ParkMap";
import { TokenIcon } from "@/components/TokenIcon";
import { useLocale } from "@/components/LocaleProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TOKEN_TYPES, resolveTokenIconSize } from "@/lib/constants";
import { isTofuProgressToken } from "@/lib/tofu-progress";
import {
  getGatheringSlots,
  getTokenLabelLocalized,
  getTokenZoneLocalized,
} from "@/lib/i18n-labels";
import { siteConfig } from "@/lib/site";
import type { TokenTypeId } from "@/lib/constants";

const CHECKPOINT_CATALOG = TOKEN_TYPES.filter(
  (token) => !isTofuProgressToken(token.id)
);

export function HomePageContent() {
  const { locale, t } = useLocale();
  const gatheringSlots = getGatheringSlots(locale);

  return (
    <PageShell>
      <header className="mb-8 text-center">
        <p className="mb-2 text-4xl">🥣</p>
        <h1 className="text-3xl font-bold tracking-tight text-brown-sugar">
          {t("home.title")}
        </h1>
        <p className="mt-2 text-sm text-brown-sugar/70">{t("home.tagline")}</p>
        <p className="mt-1 text-xs text-twilight/80">{t("home.location")}</p>
        <p className="mt-1 text-xs italic text-brown-sugar/50">
          {t("home.taglineEn")}
        </p>
        <p className="home-closed-beta">{t("home.closedBeta")}</p>
        <p className="mt-1 text-xs text-brown-sugar/75">
          {t("home.closedBetaMeetupPrefix")}
          <span className="underline decoration-brown-sugar decoration-1 underline-offset-2">
            {t("home.closedBetaMeetupPlaceBefore")}
            <span className="font-bold">{t("home.closedBetaMeetupPlaceExitNo")}</span>
            {t("home.closedBetaMeetupPlaceAfter")}
          </span>
          {t("home.closedBetaMeetupSuffix")}
        </p>
      </header>

      <InterestSignup />

      <Card className="mb-5">
        <h2 className="mb-2 font-semibold text-brown-sugar">
          {t("home.whatIsTitle")}
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-brown-sugar/80">
          {t("home.whatIsBody")}
        </p>
      </Card>

      <Card className="mb-5">
        <div className="overflow-hidden rounded-2xl border border-brown-sugar/10 bg-cream/40">
          <Image
            src="/run.intro.jpg"
            alt={t("home.introImageAlt")}
            width={1254}
            height={1254}
            className="h-auto w-full"
            sizes="(max-width: 448px) 100vw, 400px"
          />
        </div>
      </Card>

      <Card className="mb-5 bg-gradient-to-br from-sunset/10 to-tofu-white">
        <h2 className="mb-2 font-semibold text-brown-sugar">
          {t("home.gatheringTitle")}
        </h2>
        <ul className="space-y-2">
          {gatheringSlots.map((slot) => (
            <li key={slot.time} className="text-base font-medium text-red-bean">
              {slot.time}
              <span className="font-normal text-brown-sugar/70">
                （{slot.mood}）
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-xl bg-cream/60 px-3 py-2 text-sm leading-relaxed text-brown-sugar/75">
          {t("home.gatheringHint")}
        </p>
      </Card>

      <section className="mb-5">
        <h2 className="mb-3 text-center text-sm font-semibold text-brown-sugar">
          {t("home.mapTitle")}
        </h2>
        <ParkMap />
      </section>

      <Card className="mb-5">
        <h2 className="mb-3 font-semibold text-brown-sugar">
          {t("home.checkpointsTitle")}
        </h2>
        <ul className="space-y-2">
          {CHECKPOINT_CATALOG.map((token) => (
            <li
              key={token.id}
              className="flex items-center justify-between rounded-xl bg-cream/60 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <TokenIcon
                  src={token.image}
                  alt={getTokenLabelLocalized(token.id, locale)}
                  size={resolveTokenIconSize(token.id, 28)}
                />
                {getTokenZoneLocalized(token.id as TokenTypeId, locale)}
              </span>
              <span className="text-brown-sugar/60">
                {getTokenLabelLocalized(token.id, locale)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-3 border-t border-brown-sugar/10 pt-6 pb-4">
        <p className="text-center text-xs font-medium text-brown-sugar/55">
          {t("home.alreadySignedUp")}
        </p>
        <Button href="/passport" variant="secondary" className="w-full">
          {t("home.myPassport")}
        </Button>
        <Button href="/lobby" variant="secondary" className="w-full">
          {t("home.viewLobby")}
        </Button>
        <MadeByCredit className="mt-2 text-center" />
        {siteConfig.showLiveEntry && (
          <Button href="/live" className="w-full">
            {t("home.enterLive")}
          </Button>
        )}
      </div>
    </PageShell>
  );
}
