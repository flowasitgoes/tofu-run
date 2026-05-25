"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { Token } from "@/types/database";

export type TokenEarnedEvent = {
  token: Token;
  isOwn: boolean;
};

type Options = {
  userId: string | null;
  sessionId: string | null;
  /** 自己掃到或 Realtime 收到自己的 INSERT */
  onTokenEarned: (event: TokenEarnedEvent) => void;
  /** Ground：任一參與者新增 token 時刷新看板 */
  onSessionToken?: () => void;
  enabled?: boolean;
};

export function useTokenRealtime({
  userId,
  sessionId,
  onTokenEarned,
  onSessionToken,
  enabled = true,
}: Options) {
  const onEarnedRef = useRef(onTokenEarned);
  const onSessionRef = useRef(onSessionToken);

  useEffect(() => {
    onEarnedRef.current = onTokenEarned;
  }, [onTokenEarned]);

  useEffect(() => {
    onSessionRef.current = onSessionToken;
  }, [onSessionToken]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const channel = supabase.channel("tofu-run-tokens");

    if (userId) {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tokens",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const token = payload.new as Token;
          onEarnedRef.current({ token, isOwn: true });
        }
      );
    }

    if (sessionId && onSessionToken) {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tokens",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          onSessionRef.current?.();
        }
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, sessionId, enabled, onSessionToken]);
}
