"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveStatusPayload } from "@/types/database";

const EMPTY: LiveStatusPayload = {
  phase: "idle",
  sessionId: null,
  sessionDate: null,
  sessionDateLabel: null,
};

export function useLiveStatus() {
  const [status, setStatus] = useState<LiveStatusPayload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/live/status", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "載入失敗");
      setStatus({
        phase: data.phase === "active" ? "active" : "idle",
        sessionId: data.sessionId ?? null,
        sessionDate: data.sessionDate ?? null,
        sessionDateLabel: data.sessionDateLabel ?? null,
      });
      setError(null);
      return data as LiveStatusPayload;
    } catch (e) {
      const message = e instanceof Error ? e.message : "載入失敗";
      setError(message);
      setStatus(EMPTY);
      return EMPTY;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { status, loading, error, refresh };
}
