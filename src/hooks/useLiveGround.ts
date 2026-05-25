"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  mergeTokenIntoGround,
  type TokenEarnedBroadcast,
} from "@/lib/ground-merge";
import { useLiveSessionSync } from "@/hooks/useLiveSessionSync";
import type { LiveGroundPayload } from "@/types/database";

/** Realtime 即時合併為主；輪詢僅作後備 */
const POLL_MS = 60_000;

async function fetchGround(
  runnerId: string | null,
  signal: AbortSignal
): Promise<LiveGroundPayload> {
  const q = runnerId
    ? `?runnerId=${encodeURIComponent(runnerId)}`
    : "";
  const res = await fetch(`/api/live/ground${q}`, {
    cache: "no-store",
    signal,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "載入失敗");
  return data as LiveGroundPayload;
}

export function useLiveGround(runnerId: string | null) {
  const { localizeError, t } = useLocale();
  const [data, setData] = useState<LiveGroundPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? hasDataRef.current;
      const requestId = ++requestIdRef.current;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const payload = await fetchGround(runnerId, controller.signal);
        if (requestId !== requestIdRef.current) return;
        setData(payload);
        setError(null);
        hasDataRef.current = true;
      } catch (e) {
        if (controller.signal.aborted) return;
        if (requestId !== requestIdRef.current) return;
        const message =
          e instanceof Error
            ? localizeError(e.message)
            : t("common.loadFailed");
        if (!hasDataRef.current) setError(message);
      } finally {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [runnerId, localizeError, t]
  );

  const applyTokenEvent = useCallback((event: TokenEarnedBroadcast) => {
    setData((prev) => {
      if (!prev) return prev;
      return mergeTokenIntoGround(prev, event);
    });
  }, []);

  useLiveSessionSync({
    sessionId: data?.sessionId ?? null,
    participants: data?.participants ?? [],
    enabled: Boolean(data?.sessionId),
    onTokenEarned: applyTokenEvent,
    onNeedsFullReload: () => void load({ silent: true }),
  });

  useEffect(() => {
    hasDataRef.current = false;
    void load();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void load({ silent: true });
      }
    }, POLL_MS);

    return () => {
      abortRef.current?.abort();
      requestIdRef.current += 1;
      clearInterval(interval);
    };
  }, [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    reload: () => load({ silent: hasDataRef.current }),
  };
}
