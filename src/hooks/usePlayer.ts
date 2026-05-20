"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { getStoredGoingAccount } from "@/lib/goingAccount";
import { clearPassportCache } from "@/lib/passportCache";
import { getStoredPlayer, setStoredPlayer } from "@/lib/player";
import { getCurrentPosition } from "@/lib/geolocation";
import type { StoredPlayer } from "@/types/database";

export function usePlayer() {
  const { t } = useLocale();
  const [player, setPlayer] = useState<StoredPlayer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPlayer(getStoredPlayer());
    setLoading(false);
  }, []);

  const join = useCallback(async (): Promise<StoredPlayer> => {
    const going = getStoredGoingAccount();
    if (!going?.runnerId) {
      throw new Error(t("hooks.passportLoginFirst"));
    }

    const existing = getStoredPlayer();
    if (existing && existing.runnerId !== going.runnerId) {
      setStoredPlayer({
        userId: existing.userId,
        runnerId: going.runnerId,
        runnerName: existing.runnerName,
      });
    }

    const geo = await getCurrentPosition();

    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: existing?.runnerId === going.runnerId ? existing.userId : undefined,
        runnerId: going.runnerId,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? t("common.joinFailed"));

    if (data.rejoined && existing?.runnerId === going.runnerId) {
      const refreshed: StoredPlayer = {
        userId: existing.userId,
        runnerId: data.runnerId ?? going.runnerId,
        runnerName: data.runnerName ?? existing.runnerName,
      };
      setStoredPlayer(refreshed);
      setPlayer(refreshed);
      return refreshed;
    }

    const newPlayer: StoredPlayer = {
      userId: data.userId,
      runnerId: data.runnerId,
      runnerName: data.runnerName,
    };
    setStoredPlayer(newPlayer);
    setPlayer(newPlayer);
    clearPassportCache();
    return newPlayer;
  }, [t]);

  return { player, loading, join, setPlayer };
}
