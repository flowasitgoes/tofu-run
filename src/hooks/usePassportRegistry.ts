"use client";

import { useCallback, useEffect, useState } from "react";

/** 首頁載入時向 Supabase（經 API）預取已報名 Runner ID */
export function usePassportRegistry() {
  const [registeredIds, setRegisteredIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);

  const applyIds = useCallback((runnerIds: string[]) => {
    setRegisteredIds(new Set(runnerIds.map((id) => id.trim().toUpperCase())));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/going/passport-registry", {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.runnerIds)) {
        applyIds(data.runnerIds as string[]);
      } else {
        setRegisteredIds(new Set());
      }
    } catch {
      setRegisteredIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [applyIds]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addRegisteredRunnerId = useCallback((runnerId: string) => {
    const id = runnerId.trim().toUpperCase();
    if (!id) return;
    setRegisteredIds((prev) => {
      const next = new Set(prev ?? []);
      next.add(id);
      return next;
    });
  }, []);

  const hasRegistered = useCallback(
    (runnerId: string) => {
      const id = runnerId.trim().toUpperCase();
      return Boolean(id && registeredIds?.has(id));
    },
    [registeredIds]
  );

  return {
    registeredIds,
    loading,
    hasRegistered,
    addRegisteredRunnerId,
    refresh,
  };
}
