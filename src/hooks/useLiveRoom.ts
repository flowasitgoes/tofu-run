"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import type { LiveParticipant } from "@/types/database";

const POLL_MS = 30_000;

type LivePayload = {
  sessionDate: string;
  sessionDateLabel: string;
  count: number;
  onlineCount: number;
  participants: LiveParticipant[];
};

async function fetchLive(
  runnerId: string,
  signal: AbortSignal
): Promise<LivePayload> {
  const res = await fetch(
    `/api/live?runnerId=${encodeURIComponent(runnerId)}`,
    { cache: "no-store", signal }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "載入失敗");
  return {
    sessionDate: data.sessionDate,
    sessionDateLabel: data.sessionDateLabel,
    count: data.count ?? 0,
    onlineCount: data.onlineCount ?? 0,
    participants: data.participants ?? [],
  };
}

export function useLiveRoom(runnerId: string | null) {
  const { localizeError, t } = useLocale();
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [sessionDateLabel, setSessionDateLabel] = useState("");
  const [count, setCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDataRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!runnerId) return;

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
        const data = await fetchLive(runnerId, controller.signal);
        if (requestId !== requestIdRef.current) return;

        setParticipants(data.participants);
        setCount(data.count);
        setOnlineCount(data.onlineCount);
        setSessionDateLabel(data.sessionDateLabel);
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
    },
    [runnerId, localizeError, t]
  );

  useEffect(() => {
    if (!runnerId) {
      setLoading(false);
      setParticipants([]);
      setCount(0);
      setOnlineCount(0);
      hasDataRef.current = false;
      return;
    }

    hasDataRef.current = false;
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
  }, [runnerId, load]);

  return {
    participants,
    sessionDateLabel,
    count,
    onlineCount,
    loading,
    refreshing,
    error,
    reload: () => load({ silent: hasDataRef.current }),
  };
}
