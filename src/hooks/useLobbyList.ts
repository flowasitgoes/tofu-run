"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import type { GoingJoinListEntry } from "@/types/database";

const POLL_MS = 60_000;

type LobbyPayload = {
  signups: GoingJoinListEntry[];
  count: number;
};

async function fetchLobby(signal: AbortSignal): Promise<LobbyPayload> {
  const res = await fetch("/api/lobby", {
    cache: "no-store",
    signal,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "載入失敗");
  return {
    signups: data.signups ?? [],
    count: data.count ?? 0,
  };
}

export function useLobbyList() {
  const { localizeError, t } = useLocale();
  const [signups, setSignups] = useState<GoingJoinListEntry[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDataRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? hasDataRef.current;
    const requestId = ++requestIdRef.current;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchLobby(controller.signal);
      if (requestId !== requestIdRef.current) return;

      setSignups(data.signups);
      setCount(data.count);
      setError(null);
      hasDataRef.current = true;
    } catch (e) {
      if (controller.signal.aborted) return;
      if (requestId !== requestIdRef.current) return;

      const message =
        e instanceof Error
          ? localizeError(e.message)
          : t("common.loadFailed");
      if (!hasDataRef.current) {
        setError(message);
      }
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [localizeError, t]);

  useEffect(() => {
    void load();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void load({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void load({ silent: true });
      }
    }, POLL_MS);

    return () => {
      abortRef.current?.abort();
      requestIdRef.current += 1;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [load]);

  return {
    signups,
    count,
    loading,
    refreshing,
    error,
    reload: () => load({ silent: hasDataRef.current }),
  };
}
