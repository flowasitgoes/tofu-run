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
  const readerId = `live-qr-${useId().replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handlingRef = useRef(false);
  const lastActivateAtRef = useRef(0);

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

  const handleDecode = useCallback(
    async (text: string) => {
      if (handlingRef.current) return;

      const tokenType = parseTokenTypeFromScanText(text);
      if (!tokenType) {
        setError(t("live.scanInvalidQr"));
        return;
      }

      handlingRef.current = true;
      setBusy(true);
      setError(null);
      setCameraBlocked(false);
      await stopScanner();

      try {
        const result = await performTokenScan({
          userId,
          runnerId,
          runnerName,
          tokenType,
        });
        setOpen(false);
        if (result.broadcast) {
          onScanned(result.broadcast);
        } else {
          onScanned({
            sessionId: result.sessionId,
            tokenId: `local-${Date.now()}`,
            userId,
            runnerId,
            displayName: runnerName,
            tokenType: result.tokenType,
            scannedAt: result.scannedAt,
          });
        }
      } catch (e) {
        const raw = e instanceof Error ? e.message : "";
        setError(
          raw === "SCAN_TIMEOUT"
            ? t("common.scanFailed")
            : localizeError(raw) || t("common.scanFailed")
        );
        handlingRef.current = false;
        setBusy(false);
      }
    },
    [
      userId,
      runnerId,
      runnerName,
      onScanned,
      stopScanner,
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
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1,
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
    setOpen(true);
  }, [disabled, busy, open]);

  useEffect(() => {
    if (!open) {
      handlingRef.current = false;
      setBusy(false);
      setCameraBlocked(false);
      void stopScanner();
      return;
    }

    let cancelled = false;
    void startScanner().catch(() => {
      if (cancelled) return;
      setCameraBlocked(true);
      setError(t("live.scanCameraDenied"));
    });

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [open, startScanner, stopScanner, t]);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError(null);
    setCameraBlocked(false);
  };

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
          className="fixed inset-0 z-50 flex flex-col bg-brown-sugar/92 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-scan-title"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3
              id="live-scan-title"
              className="text-base font-semibold text-cream"
            >
              {t("live.scanToken")}
            </h3>
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="rounded-lg px-3 py-1.5 text-sm text-cream/90 underline disabled:opacity-40"
            >
              {t("live.scanClose")}
            </button>
          </div>

          {cameraBlocked ? (
            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
              <p className="text-sm leading-relaxed text-cream/90">
                {error ?? t("live.scanCameraDenied")}
              </p>
              <button
                type="button"
                onClick={close}
                className="w-full max-w-xs rounded-2xl bg-[#fc8e0b] px-6 py-3 text-sm font-semibold text-white shadow-md active:scale-[0.98]"
              >
                {t("live.scanBackToLive")}
              </button>
            </div>
          ) : (
            <>
              <p className="mb-3 text-center text-xs text-cream/75">
                {t("live.scanHint")}
              </p>

              <div className="relative mx-auto w-full max-w-sm min-h-[240px] flex-1">
                <div
                  id={readerId}
                  className="h-full min-h-[240px] overflow-hidden rounded-2xl bg-black [&_video]:rounded-2xl"
                />
                {busy ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
                    <p className="text-sm font-medium text-cream">
                      {t("scan.scanning")}
                    </p>
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="mt-4 space-y-3 text-center">
                  <p className="text-sm text-red-bean/90">{error}</p>
                  <button
                    type="button"
                    onClick={close}
                    className="w-full max-w-xs rounded-2xl border border-cream/30 px-6 py-2.5 text-sm font-medium text-cream"
                  >
                    {t("live.scanBackToLive")}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
