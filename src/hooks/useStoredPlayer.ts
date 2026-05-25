"use client";

import { useEffect, useState } from "react";
import { getStoredPlayer } from "@/lib/player";
import type { StoredPlayer } from "@/types/database";

/** 避免 SSR 與 localStorage 不一致造成 hydration 錯誤 */
export function useStoredPlayerSnapshot() {
  const [player, setPlayer] = useState<StoredPlayer | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPlayer(getStoredPlayer());
    setMounted(true);
  }, []);

  return { player, mounted };
}
