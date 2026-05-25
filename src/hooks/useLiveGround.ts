"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  mergeTokenIntoGround,
  type TokenEarnedBroadcast,
} from "@/lib/ground-merge";
import { useLiveSessionSync } from "@/hooks/useLiveSessionSync";
import {
  getLiveGroundCache,
  setLiveGroundCache,
} from "@/lib/liveSession";
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

function hydrateFromCache(runnerId: string | null) {
  if (!runnerId) return null;
  const cached = getLiveGroundCache(runnerId);
  if (!cached) return null;
  const { runnerId: _r, cachedAt: _t, ...payload } = cached;
  return payload as LiveGroundPayload;
}

export function useLiveGround(runnerId: string | null) {
  const { localizeError, t } = useLocale();
  const initial = runnerId ? hydrateFromCache(runnerId) : null;

  const [data, setData] = useState<LiveGroundPayload | null>(initial);
  const [loading, setLoading] = useState(!initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(Boolean(initial));
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const persistCache = useCallback(
    (payload: LiveGroundPayload) => {
      if (runnerId) setLiveGroundCache(runnerId, payload);
    },
    [runnerId]
  );

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
        persistCache(payload);
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
    [runnerId, localizeError, t, persistCache]
  );

  const applyTokenEvent = useCallback(
    (event: TokenEarnedBroadcast) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = mergeTokenIntoGround(prev, event);
        persistCache(next);
        return next;
      });
    },
    [persistCache]
  );

  useLiveSessionSync({
    sessionId: data?.sessionId ?? null,
    participants: data?.participants ?? [],
    enabled: Boolean(data?.sessionId),
    onTokenEarned: applyTokenEvent,
    onNeedsFullReload: () => void load({ silent: true }),
  });

  useEffect(() => {
    const cached = runnerId ? hydrateFromCache(runnerId) : null;
    hasDataRef.current = Boolean(cached);
    setData(cached);
    setLoading(!cached);
    setError(null);
    void load({ silent: Boolean(cached) });

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
  }, [load, runnerId]);

  return {
    data,
    loading,
    refreshing,
    error,
    hasCachedData: hasDataRef.current,
    reload: () => load({ silent: hasDataRef.current }),
  };
}
