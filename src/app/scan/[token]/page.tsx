"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TokenIcon } from "@/components/TokenIcon";
import { TOKEN_TYPES, resolveTokenIconSize } from "@/lib/constants";
import {
  getTokenLabelLocalized,
  getTokenZoneLocalized,
} from "@/lib/i18n-labels";
import type { TokenTypeId } from "@/lib/constants";
import { useStoredPlayerSnapshot } from "@/hooks/useStoredPlayer";
import { performTokenScan } from "@/lib/perform-token-scan";
import {
  getLiveRoomCache,
  markReturningFromScan,
  prefetchLiveRoomCache,
  setLiveRoomCache,
  setStoredLiveRunnerId,
} from "@/lib/liveSession";
import { getTodayDateString } from "@/lib/session";

const VALID = TOKEN_TYPES.map((t) => t.id);
const LOADING_MIN_MS = 1000;
const LOADING_MAX_MS = 1500;
/** 成功畫面停留後自動回 LIVE */
const REDIRECT_TO_LIVE_MS = 1600;
function randomLoadingMs() {
  return (
    LOADING_MIN_MS +
    Math.floor(Math.random() * (LOADING_MAX_MS - LOADING_MIN_MS + 1))
  );
}

function waitMs(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function ScanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { locale, t, localizeError } = useLocale();
  const { token } = use(params);
  const tokenType = token.toLowerCase();
  const tokenInfo = TOKEN_TYPES.find((t) => t.id === tokenType);
  const { player } = useStoredPlayerSnapshot();

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [barPercent, setBarPercent] = useState(0);
  const [barDurationMs, setBarDurationMs] = useState(1250);
  const [error, setError] = useState<string | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const scanRef = useRef(false);

  useEffect(() => {
    if (!player?.runnerId) return;
    setStoredLiveRunnerId(player.runnerId);
    const rid = player.runnerId;
    if (getLiveRoomCache(rid)) return;
    void fetch(`/api/live?runnerId=${encodeURIComponent(rid)}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.sessionId) return;
        setLiveRoomCache({
          runnerId: rid,
          sessionDate: data.sessionDate,
          sessionDateLabel: data.sessionDateLabel,
          sessionId: data.sessionId,
          count: data.count ?? 0,
          onlineCount: data.onlineCount ?? 0,
          participants: data.participants ?? [],
          feed: data.feed ?? [],
        });
      })
      .catch(() => {});
  }, [player?.runnerId]);

  useEffect(() => {
    if (player && tokenInfo && status === "idle") {
      void handleScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, tokenInfo]);

  useEffect(() => {
    if (status !== "success") return;
    const id = window.setTimeout(() => {
      router.replace("/live");
    }, REDIRECT_TO_LIVE_MS);
    return () => window.clearTimeout(id);
  }, [status, router]);

  async function persistScan(): Promise<string> {
    if (!player || !tokenInfo) throw new Error(t("common.scanFailed"));

    const { scannedAt } = await performTokenScan({
      userId: player.userId,
      runnerId: player.runnerId,
      runnerName: player.runnerName,
      tokenType,
    });
    return scannedAt;
  }

  async function handleScan() {
    if (!player || !tokenInfo || scanRef.current) return;
    scanRef.current = true;

    const duration = randomLoadingMs();
    setError(null);
    setScannedAt(null);
    setBarPercent(0);
    setBarDurationMs(duration);
    setStatus("loading");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setBarPercent(100));
    });

    try {
      const at = await persistScan();
      const prefetchPromise = prefetchLiveRoomCache(player.runnerId);
      await waitMs(duration);
      await prefetchPromise.catch(() => {});
      setScannedAt(at);
      setStoredLiveRunnerId(player.runnerId);
      markReturningFromScan({
        tokenType,
        scannedAt: at,
        sessionDate: getTodayDateString(),
      });
      setStatus("success");
    } catch (e) {
      setBarPercent(0);
      setStatus("error");
      const raw = e instanceof Error ? e.message : "";
      setError(
        raw === "SCAN_TIMEOUT"
          ? t("common.scanFailed")
          : localizeError(raw) || t("common.scanFailed")
      );
    } finally {
      scanRef.current = false;
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
              size={resolveTokenIconSize(tokenInfo.id, 80)}
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
              size={resolveTokenIconSize(tokenInfo.id, 100)}
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

        {status === "loading" && (
          <Card className="mt-8 w-full">
            <p className="text-sm font-medium text-brown-sugar">
              {t("scan.scanning")}
            </p>
            <div
              className="mt-4 h-2 w-full overflow-hidden rounded-full bg-brown-sugar/10"
              role="progressbar"
              aria-valuenow={barPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-mung-green ease-out"
                style={{
                  width: `${barPercent}%`,
                  transitionProperty: "width",
                  transitionDuration: `${barDurationMs}ms`,
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </div>
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
            <p className="mt-4 text-xs text-brown-sugar/50">
              {t("scan.redirectingToLive")}
            </p>
            <Button href="/live" className="mt-3 w-full">
              {t("scan.backLive")}
            </Button>
          </Card>
        )}

        {status === "error" && (
          <Card className="mt-8 w-full">
            <p className="text-red-bean">{error}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button href="/live" variant="secondary" className="w-full">
                {t("scan.backLive")}
              </Button>
              <Button className="w-full" onClick={() => void handleScan()}>
                {t("common.retry")}
              </Button>
            </div>
          </Card>
        )}

        {status === "idle" && (
          <Button className="mt-8 w-full" onClick={() => void handleScan()}>
            {t("scan.scanThis")}
          </Button>
        )}

        <Link
          href="/live"
          className="mt-6 text-xs text-brown-sugar/50 underline"
        >
          {t("scan.backLive")}
        </Link>
      </div>
    </PageShell>
  );
}
