"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TokenIcon } from "@/components/TokenIcon";
import { TOKEN_TYPES } from "@/lib/constants";
import {
  getTokenLabelLocalized,
  getTokenZoneLocalized,
} from "@/lib/i18n-labels";
import type { TokenTypeId } from "@/lib/constants";
import { getCurrentPosition } from "@/lib/geolocation";
import { useStoredPlayerSnapshot } from "@/hooks/useStoredPlayer";

const VALID = TOKEN_TYPES.map((t) => t.id);

export default function ScanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { locale, t, localizeError } = useLocale();
  const { token } = use(params);
  const tokenType = token.toLowerCase();
  const tokenInfo = TOKEN_TYPES.find((t) => t.id === tokenType);
  const { player } = useStoredPlayerSnapshot();

  const [status, setStatus] = useState<
    "idle" | "scanning" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  useEffect(() => {
    if (player && tokenInfo && status === "idle") {
      handleScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, tokenInfo]);

  async function handleScan() {
    if (!player || !tokenInfo) return;
    setStatus("scanning");
    setError(null);

    const geo = await getCurrentPosition();

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: player.userId,
          tokenType,
          lat: geo?.lat ?? null,
          lng: geo?.lng ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScannedAt(data.scannedAt);
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error ? localizeError(e.message) : t("common.scanFailed")
      );
    }
  }

  if (!VALID.includes(tokenType as (typeof VALID)[number])) {
    return (
      <PageShell showNav={false}>
        <Card className="mt-16 text-center">
          <p className="text-red-bean">{t("scan.invalidToken")}</p>
          <Button href="/" className="mt-4 w-full">
            {t("scan.backHome")}
          </Button>
        </Card>
      </PageShell>
    );
  }

  if (!player) {
    return (
      <PageShell showNav={false}>
        <Card className="mt-16 text-center">
          {tokenInfo && (
            <TokenIcon
              src={tokenInfo.image}
              alt={tokenInfo.label}
              size={80}
              className="mx-auto mb-4"
            />
          )}
          <h1 className="text-xl font-bold">
            {tokenInfo &&
              getTokenZoneLocalized(tokenInfo.id as TokenTypeId, locale)}
          </h1>
          <p className="mt-4 text-sm text-brown-sugar/70">{t("scan.joinFirst")}</p>
          <Button href="/join" className="mt-6 w-full">
            {t("scan.joinActivity")}
          </Button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell showNav={false}>
      <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
        {tokenInfo && (
          <div className="mb-4 animate-float">
            <TokenIcon
              src={tokenInfo.image}
              alt={tokenInfo.label}
              size={96}
              className="mx-auto"
            />
          </div>
        )}
        <h1 className="text-2xl font-bold text-brown-sugar">
          {tokenInfo &&
            getTokenZoneLocalized(tokenInfo.id as TokenTypeId, locale)}
        </h1>
        <p className="text-sm text-brown-sugar/60">
          {getTokenLabelLocalized(tokenType, locale)}
        </p>

        {status === "scanning" && (
          <Card className="mt-8 w-full">
            <p className="animate-pulse-soft">{t("scan.scanning")}</p>
            <p className="mt-2 text-xs text-brown-sugar/50">{t("scan.gpsHint")}</p>
          </Card>
        )}

        {status === "success" && (
          <Card className="mt-8 w-full border-2 border-mung-green/30">
            <p className="text-2xl">✨</p>
            <p className="mt-2 font-semibold text-mung-green">{t("scan.recorded")}</p>
            <p className="mt-1 font-mono text-xs text-brown-sugar/60">
              {player.runnerName} · {player.runnerId}
            </p>
            {scannedAt && (
              <p className="mt-2 text-xs text-brown-sugar/50">
                {new Date(scannedAt).toLocaleString(locale === "en" ? "en-US" : "zh-TW", {
                  timeZone: "Asia/Taipei",
                })}
              </p>
            )}
            <Button href="/passport" className="mt-6 w-full">
              {t("scan.viewPassport")}
            </Button>
          </Card>
        )}

        {status === "error" && (
          <Card className="mt-8 w-full">
            <p className="text-red-bean">{error}</p>
            <Button className="mt-4 w-full" onClick={handleScan}>
              {t("common.retry")}
            </Button>
          </Card>
        )}

        {status === "idle" && (
          <Button className="mt-8 w-full" onClick={handleScan}>
            {t("scan.scanThis")}
          </Button>
        )}

        <Link
          href="/lobby"
          className="mt-6 text-xs text-brown-sugar/50 underline"
        >
          {t("scan.backLobby")}
        </Link>
      </div>
    </PageShell>
  );
}
