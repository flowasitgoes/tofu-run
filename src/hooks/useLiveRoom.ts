"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { useLiveSessionSync } from "@/hooks/useLiveSessionSync";
import {
  mergeTokenIntoLiveParticipants,
  prependLiveFeedItem,
} from "@/lib/live-merge";
import {
  clearReturningFromScan,
  getLiveRoomCache,
  isReturningFromScan,
  setLiveRoomCache,
} from "@/lib/liveSession";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getTodayDateString } from "@/lib/session";
import type { GroundFeedItem, LiveParticipant } from "@/types/database";

/** Realtime 為主；輪詢僅作 Replication 未開 user_sessions 時的後備 */
const POLL_MS = 45_000;
const REALTIME_DEBOUNCE_MS = 250;
/** 從掃描頁回 LIVE：先顯示快取，延後背景更新 */
const RETURN_FROM_SCAN_DEFER_MS = 2800;

type LivePayload = {
  sessionDate: string;
  sessionDateLabel: string;
  sessionId: string;
  count: number;
  onlineCount: number;
  participants: LiveParticipant[];
  feed: GroundFeedItem[];
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
    feed: data.feed ?? [],
  };
}

function hydrateFromCache(runnerId: string) {
  const cached = getLiveRoomCache(runnerId);
  if (!cached) return null;
  return {
    participants: cached.participants,
    feed: cached.feed ?? [],
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
  const [feed, setFeed] = useState<GroundFeedItem[]>(initial?.feed ?? []);
  const [sessionDateLabel, setSessionDateLabel] = useState(
    initial?.sessionDateLabel ?? ""
  );
  const [count, setCount] = useState(initial?.count ?? 0);
  const [onlineCount, setOnlineCount] = useState(initial?.onlineCount ?? 0);
  const [loading, setLoading] = useState(!initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(
    initial?.sessionId ?? null
  );

  const hasDataRef = useRef(Boolean(initial));
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const reloadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deferReloadRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextVisibleReloadRef = useRef(false);

  const applyPayload = useCallback((data: LivePayload) => {
    setParticipants(data.participants);
    setFeed(data.feed);
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
        feed: data.feed,
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

  useLiveSessionSync({
    sessionId,
    participants,
    enabled: Boolean(sessionId),
    onTokenEarned: (event) => {
      setParticipants((prev) => mergeTokenIntoLiveParticipants(prev, event));
      setFeed((prev) => prependLiveFeedItem(prev, event));
      scheduleSilentReload();
    },
    onNeedsFullReload: () => scheduleSilentReload(),
  });

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
      setFeed([]);
      setCount(0);
      setOnlineCount(0);
      setSessionId(null);
      hasDataRef.current = false;
      return;
    }

    const fromScan = isReturningFromScan();
    if (fromScan) {
      clearReturningFromScan();
      skipNextVisibleReloadRef.current = true;
    }

    const cached = hydrateFromCache(runnerId);
    if (cached) {
      setParticipants(cached.participants);
      setFeed(cached.feed);
      setCount(cached.count);
      setOnlineCount(cached.onlineCount);
      setSessionDateLabel(cached.sessionDateLabel);
      setSessionId(cached.sessionId);
      hasDataRef.current = true;
      setLoading(false);

      const deferMs = fromScan ? RETURN_FROM_SCAN_DEFER_MS : 0;
      if (deferMs > 0) {
        deferReloadRef.current = setTimeout(() => {
          deferReloadRef.current = null;
          void load({ silent: true });
        }, deferMs);
      } else {
        void load({ silent: true });
      }
    } else {
      hasDataRef.current = false;
      if (fromScan) {
        setLoading(false);
        deferReloadRef.current = setTimeout(() => {
          deferReloadRef.current = null;
          void load();
        }, RETURN_FROM_SCAN_DEFER_MS);
      } else {
        void load();
      }
    }

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (skipNextVisibleReloadRef.current) {
        skipNextVisibleReloadRef.current = false;
        return;
      }
      void load({ silent: true });
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
      if (deferReloadRef.current) {
        clearTimeout(deferReloadRef.current);
        deferReloadRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [runnerId, load]);

  return {
    participants,
    feed,
    sessionDateLabel,
    sessionId,
    count,
    onlineCount,
    loading,
    refreshing,
    error,
    hasCachedData: hasDataRef.current,
    reload: () => load({ silent: hasDataRef.current }),
  };
}
