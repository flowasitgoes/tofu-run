"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  clearReturnFromScan,
  getLiveRoomCache,
  setLiveRoomCache,
  shouldDeferLiveRefetch,
} from "@/lib/liveSession";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getTodayDateString } from "@/lib/session";
import type { LiveParticipant } from "@/types/database";

/** Realtime 為主；輪詢僅作 Replication 未開 user_sessions 時的後備 */
const POLL_MS = 45_000;
const REALTIME_DEBOUNCE_MS = 250;

type LivePayload = {
  sessionDate: string;
  sessionDateLabel: string;
  sessionId: string;
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
    sessionId: data.sessionId as string,
    count: data.count ?? 0,
    onlineCount: data.onlineCount ?? 0,
    participants: data.participants ?? [],
  };
}

function hydrateFromCache(runnerId: string) {
  const cached = getLiveRoomCache(runnerId);
  if (!cached) return null;
  return {
    participants: cached.participants,
    sessionDateLabel: cached.sessionDateLabel,
    count: cached.count,
    onlineCount: cached.onlineCount,
    sessionId: cached.sessionId,
  };
}

export function useLiveRoom(runnerId: string | null) {
  const { localizeError, t } = useLocale();
  const initial = runnerId ? hydrateFromCache(runnerId) : null;

  const [participants, setParticipants] = useState<LiveParticipant[]>(
    initial?.participants ?? []
  );
  const [sessionDateLabel, setSessionDateLabel] = useState(
    initial?.sessionDateLabel ?? ""
  );
  const [count, setCount] = useState(initial?.count ?? 0);
  const [onlineCount, setOnlineCount] = useState(initial?.onlineCount ?? 0);
  const [loading, setLoading] = useState(!initial && !shouldDeferLiveRefetch());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(
    initial?.sessionId ?? null
  );

  const hasDataRef = useRef(Boolean(initial));
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const reloadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyPayload = useCallback((data: LivePayload) => {
    setParticipants(data.participants);
    setCount(data.count);
    setOnlineCount(data.onlineCount);
    setSessionDateLabel(data.sessionDateLabel);
    if (data.sessionId) setSessionId(data.sessionId);
    if (runnerId) {
      setLiveRoomCache({
        runnerId,
        sessionDate: data.sessionDate ?? getTodayDateString(),
        sessionDateLabel: data.sessionDateLabel,
        sessionId: data.sessionId,
        count: data.count,
        onlineCount: data.onlineCount,
        participants: data.participants,
      });
    }
  }, [runnerId]);

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

        applyPayload(data);
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
    [runnerId, localizeError, t, applyPayload]
  );

  const scheduleSilentReload = useCallback(() => {
    if (reloadDebounceRef.current) {
      clearTimeout(reloadDebounceRef.current);
    }
    reloadDebounceRef.current = setTimeout(() => {
      reloadDebounceRef.current = null;
      void load({ silent: true });
    }, REALTIME_DEBOUNCE_MS);
  }, [load]);

  useEffect(() => {
    if (!runnerId || !sessionId) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const channel = supabase.channel(`live-room-${sessionId}`);

    const onSessionChange = () => {
      scheduleSilentReload();
    };

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_sessions",
          filter: `session_id=eq.${sessionId}`,
        },
        onSessionChange
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_sessions",
          filter: `session_id=eq.${sessionId}`,
        },
        onSessionChange
      )
      .subscribe();

    return () => {
      if (reloadDebounceRef.current) {
        clearTimeout(reloadDebounceRef.current);
        reloadDebounceRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [runnerId, sessionId, scheduleSilentReload]);

  useEffect(() => {
    if (!runnerId) {
      setLoading(false);
      setParticipants([]);
      setCount(0);
      setOnlineCount(0);
      setSessionId(null);
      hasDataRef.current = false;
      return;
    }

    const cached = hydrateFromCache(runnerId);
    const deferRefetch = shouldDeferLiveRefetch();
    let deferTimer: ReturnType<typeof setTimeout> | null = null;

    if (cached) {
      setParticipants(cached.participants);
      setCount(cached.count);
      setOnlineCount(cached.onlineCount);
      setSessionDateLabel(cached.sessionDateLabel);
      setSessionId(cached.sessionId);
      hasDataRef.current = true;
      setLoading(false);
      if (deferRefetch) {
        deferTimer = window.setTimeout(() => {
          clearReturnFromScan();
          void load({ silent: true });
        }, 2000);
      } else {
        void load({ silent: true });
      }
    } else if (deferRefetch) {
      setLoading(false);
      deferTimer = window.setTimeout(() => {
        clearReturnFromScan();
        void load();
      }, 300);
    } else {
      hasDataRef.current = false;
      void load();
    }

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (shouldDeferLiveRefetch()) return;
      void load({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void load({ silent: true });
      }
    }, POLL_MS);

    return () => {
      if (deferTimer) clearTimeout(deferTimer);
      abortRef.current?.abort();
      requestIdRef.current += 1;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [runnerId, load]);

  return {
    participants,
    sessionDateLabel,
    sessionId,
    count,
    onlineCount,
    loading,
    refreshing,
    error,
    reload: () => load({ silent: hasDataRef.current }),
  };
}
