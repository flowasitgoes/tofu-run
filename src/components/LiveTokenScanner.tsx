"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useLocale } from "@/components/LocaleProvider";
import { parseTokenTypeFromScanText } from "@/lib/parse-scan-url";
import { performTokenScan } from "@/lib/perform-token-scan";

type LiveTokenScannerProps = {
  userId: string;
  runnerId: string;
  runnerName: string;
  disabled?: boolean;
  onScanned: (tokenType: string) => void;
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
  const readerId = `live-qr-${useId().replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handlingRef = useRef(false);

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
      await stopScanner();

      try {
        await performTokenScan({
          userId,
          runnerId,
          runnerName,
          tokenType,
        });
        setOpen(false);
        onScanned(tokenType);
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

  useEffect(() => {
    if (!open) {
      handlingRef.current = false;
      setBusy(false);
      void stopScanner();
      return;
    }

    setError(null);
    void startScanner().catch(() => {
      setError(t("live.scanCameraDenied"));
    });

    return () => {
      void stopScanner();
    };
  }, [open, startScanner, stopScanner, t]);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError(null);
  };

  const isHeader = placement === "header";

  return (
    <>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setOpen(true)}
        className={
          isHeader
            ? "flex h-[4.25rem] w-[4.25rem] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-[#fc8e0b]/12 text-[#fc8e0b] ring-2 ring-[#fc8e0b]/25 transition-colors hover:bg-[#fc8e0b]/20 active:scale-[0.98] disabled:opacity-40"
            : "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-brown-sugar transition-colors hover:bg-sunset/15 disabled:opacity-40"
        }
        aria-label={t("live.scanToken")}
      >
        <ScanGlyph className={isHeader ? "h-7 w-7" : "h-7 w-7"} />
        {!isHeader ? (
          <span className="text-[10px] font-medium text-brown-sugar/70">
            {t("live.scanToken")}
          </span>
        ) : (
          <span className="text-[10px] font-semibold leading-none">
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

          <p className="mb-3 text-center text-xs text-cream/75">
            {t("live.scanHint")}
          </p>

          <div className="relative mx-auto w-full max-w-sm flex-1 min-h-[240px]">
            <div
              id={readerId}
              className="overflow-hidden rounded-2xl bg-black [&_video]:rounded-2xl"
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
            <p className="mt-3 text-center text-sm text-red-bean/90">{error}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
