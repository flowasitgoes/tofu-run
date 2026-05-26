"use client";

import { useEffect, useState } from "react";
import { PLAYER_UPDATED_EVENT, getStoredPlayer } from "@/lib/player";
import type { StoredPlayer } from "@/types/database";

/** 避免 SSR 與 localStorage 不一致造成 hydration 錯誤 */
export function useStoredPlayerSnapshot() {
  const [player, setPlayer] = useState<StoredPlayer | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const syncPlayer = () => setPlayer(getStoredPlayer());
    syncPlayer();
    window.addEventListener("storage", syncPlayer);
    window.addEventListener(PLAYER_UPDATED_EVENT, syncPlayer);
    setMounted(true);
    return () => {
      window.removeEventListener("storage", syncPlayer);
      window.removeEventListener(PLAYER_UPDATED_EVENT, syncPlayer);
    };
  }, []);

  return { player, mounted };
}
