"use client";

import { useEffect, useState } from "react";
import {
  clearStoredGoingAccount,
  getStoredGoingAccount,
  type StoredGoingAccount,
} from "@/lib/goingAccount";
import { clearStoredPlayer } from "@/lib/player";

/** 避免 SSR 與 localStorage 不一致造成 hydration 錯誤 */
export function useStoredGoingAccount() {
  const [account, setAccount] = useState<StoredGoingAccount | null>(() =>
    typeof window !== "undefined" ? getStoredGoingAccount() : null
  );
  const [mounted, setMounted] = useState(() => typeof window !== "undefined");

  useEffect(() => {
    setAccount(getStoredGoingAccount());
    setMounted(true);
  }, []);

  function logout() {
    clearStoredGoingAccount();
    clearStoredPlayer();
    setAccount(null);
  }

  return { account, mounted, logout };
}
