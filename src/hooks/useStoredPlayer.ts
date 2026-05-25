"use client";

import { useEffect, useState } from "react";
import { getStoredPlayer } from "@/lib/player";
import type { StoredPlayer } from "@/types/database";

export function useStoredPlayerSnapshot() {
  const [player, setPlayer] = useState<StoredPlayer | null>(() =>
    typeof window !== "undefined" ? getStoredPlayer() : null
  );
  const [mounted, setMounted] = useState(() => typeof window !== "undefined");

  useEffect(() => {
    setPlayer(getStoredPlayer());
    setMounted(true);
  }, []);

  return { player, mounted };
}
