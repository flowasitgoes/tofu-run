"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useLocale } from "@/components/LocaleProvider";
import { parseTokenTypeFromScanText } from "@/lib/parse-scan-url";
import type { TokenEarnedBroadcast } from "@/lib/ground-merge";
import { performTokenScan } from "@/lib/perform-token-scan";

type LiveTokenScannerProps = {
  userId: string;
  runnerId: string;
  runnerName: string;
  disabled?: boolean;
  onScanned: (event: TokenEarnedBroadcast) => void;
  /** 頁首「今日在場」右側大按鈕 */
  placement?: "header" | "inline";
};

function ScanGlyph({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M9 12h6" />
    </svg>
  );
}

function ScanRecoveryPanel({
  message,
  backLabel,
  onBack,
}: {
  message: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-4 pb-8">
      <p className="text-base leading-relaxed text-cream">{message}</p>
      <button
        type="button"
        onClick={onBack}
        className="w-full max-w-xs shrink-0 rounded-2xl bg-[#fc8e0b] px-6 py-3.5 text-base font-semibold text-white shadow-md active:scale-[0.98]"
      >
        {backLabel}
      </button>
    </div>
  );
}

export function LiveTokenScanner({
  userId,
  runnerId,
  runnerName,
  disabled = false,
  onScanned,
  placement = "inline",
}: LiveTokenScannerProps) {
  const { t, localizeError } = useLocale();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  /** 掃描失敗（冷卻、重複等）：全螢幕提示 + 返回 LIVE，不留在黑畫面 */
  const [scanFailed, setScanFailed] = useState(false);
  const readerId = `live-qr-${useId().replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handlingRef = useRef(false);
  const lastActivateAtRef = useRef(0);
  const onScannedRef = useRef(onScanned);
  onScannedRef.current = onScanned;

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
    } catch {
      /* ignore */
    }
    try {
      await scanner.clear();
    } catch {
      /* ignore */
    }
  }, []);

  const enterRecovery = useCallback(
    (message: string) => {
      void stopScanner();
      setCameraBlocked(false);
      setScanFailed(true);
      setError(message);
      setBusy(false);
      handlingRef.current = false;
    },
    [stopScanner]
  );

  const handleDecode = useCallback(
    async (text: string) => {
      if (handlingRef.current) return;

      const tokenType = parseTokenTypeFromScanText(text);
      if (!tokenType) {
        enterRecovery(t("live.scanInvalidQr"));
        return;
      }

      handlingRef.current = true;
      setBusy(true);
      setError(null);
      setCameraBlocked(false);
      setScanFailed(false);
      await stopScanner();

      try {
        const result = await performTokenScan({
          userId,
          runnerId,
          runnerName,
          tokenType,
        });
        setOpen(false);
        setScanFailed(false);
        const broadcast =
          result.broadcast ??
          ({
            sessionId: result.sessionId,
            tokenId: `local-${Date.now()}`,
            userId,
            runnerId,
            displayName: runnerName,
            tokenType: result.tokenType,
            scannedAt: result.scannedAt,
          } satisfies TokenEarnedBroadcast);
        onScannedRef.current(broadcast);
      } catch (e) {
        const raw = e instanceof Error ? e.message : "";
        enterRecovery(
          raw === "SCAN_TIMEOUT"
            ? t("common.scanFailed")
            : localizeError(raw) || t("common.scanFailed")
        );
      }
    },
    [
      userId,
      runnerId,
      runnerName,
      stopScanner,
      enterRecovery,
      t,
      localizeError,
    ]
  );

  const startScanner = useCallback(async () => {
    await stopScanner();
    if (!document.getElementById(readerId)) return;

    const scanner = new Html5Qrcode(readerId);
    scannerRef.current = scanner;

    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        aspectRatio: 1,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(edge * 0.82);
          return { width: size, height: size };
        },
      },
      (decoded) => {
        void handleDecode(decoded);
      },
      () => {}
    );
  }, [readerId, stopScanner, handleDecode]);

  const openScanner = useCallback(() => {
    if (disabled || busy || open) return;
    const now = Date.now();
    if (now - lastActivateAtRef.current < 400) return;
    lastActivateAtRef.current = now;
    setError(null);
    setCameraBlocked(false);
    setScanFailed(false);
    setOpen(true);
  }, [disabled, busy, open]);

  const showRecovery = cameraBlocked || scanFailed;

  useEffect(() => {
    if (!open) {
      handlingRef.current = false;
      setBusy(false);
      setCameraBlocked(false);
      setScanFailed(false);
      void stopScanner();
      return;
    }

    if (showRecovery) {
      void stopScanner();
      return;
    }

    let cancelled = false;
    void startScanner().catch(() => {
      if (cancelled) return;
      setCameraBlocked(true);
      setError(t("live.scanCameraDenied"));
      setBusy(false);
    });

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [open, showRecovery, startScanner, stopScanner, t]);

  const backToLive = useCallback(() => {
    handlingRef.current = false;
    setBusy(false);
    setOpen(false);
    setError(null);
    setCameraBlocked(false);
    setScanFailed(false);
    void stopScanner();
  }, [stopScanner]);

  const recoveryMessage =
    error ??
    (cameraBlocked ? t("live.scanCameraDenied") : t("common.scanFailed"));

  const isHeader = placement === "header";

  const headerButtonClass = isHeader
    ? [
        "flex h-[4.25rem] w-[4.25rem] shrink-0 cursor-pointer select-none touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl text-white shadow-sm ring-2 ring-[#e07d0a] [-webkit-tap-highlight-color:transparent]",
        "bg-[#fc8e0b]",
        "active:scale-[0.97] active:brightness-95",
        "disabled:opacity-40",
      ].join(" ")
    : "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-brown-sugar transition-colors hover:bg-sunset/15 disabled:opacity-40 touch-manipulation [-webkit-tap-highlight-color:transparent]";

  return (
    <>
      <button
        type="button"
        disabled={disabled || busy}
        onPointerUp={(e) => {
          if (disabled || busy) return;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          openScanner();
        }}
        onClick={(e) => {
          e.preventDefault();
          openScanner();
        }}
        className={headerButtonClass}
        aria-label={t("live.scanToken")}
        aria-expanded={open}
      >
        <ScanGlyph className={isHeader ? "h-7 w-7" : "h-7 w-7"} />
        {!isHeader ? (
          <span className="text-[10px] font-medium text-brown-sugar/70">
            {t("live.scanToken")}
          </span>
        ) : (
          <span className="text-[10px] font-semibold leading-none text-white/95">
            {t("live.scanToken")}
          </span>
        )}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-brown-sugar/95 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(5.5rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-scan-title"
        >
          <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
            <h3
              id="live-scan-title"
              className="text-base font-semibold text-cream"
            >
              {showRecovery ? t("live.scanBackToLive") : t("live.scanToken")}
            </h3>
            {showRecovery ? (
              <button
                type="button"
                onClick={backToLive}
                className="shrink-0 rounded-xl bg-[#fc8e0b] px-4 py-2 text-sm font-semibold text-white active:scale-[0.98]"
              >
                {t("live.scanBackToLive")}
              </button>
            ) : (
              <button
                type="button"
                onClick={backToLive}
                className="rounded-lg px-3 py-1.5 text-sm text-cream/90 underline"
              >
                {t("live.scanClose")}
              </button>
            )}
          </div>

          {showRecovery ? (
            <ScanRecoveryPanel
              message={recoveryMessage}
              backLabel={t("live.scanBackToLive")}
              onBack={backToLive}
            />
          ) : (
            <>
              <div className="mb-3 shrink-0 text-center">
                <p className="text-xs text-cream/75">{t("live.scanHint")}</p>
                <button
                  type="button"
                  onClick={backToLive}
                  className="mt-2 text-sm font-semibold text-[#fc8e0b] underline underline-offset-2 active:opacity-80"
                >
                  {t("live.scanBackToLive")}
                </button>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center px-1">
                <div className="relative h-[min(68dvh,22rem,92vw)] w-[min(68dvh,22rem,92vw)] shrink-0">
                  <div
                    id={readerId}
                    className="absolute inset-0 overflow-hidden rounded-2xl bg-black [&_canvas]:!hidden [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover [&_video]:rounded-2xl"
                  />
                  {busy ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/60">
                      <p className="text-sm font-medium text-cream">
                        {t("scan.scanning")}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
