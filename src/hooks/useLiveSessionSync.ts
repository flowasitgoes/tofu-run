"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import {
  LIVE_TOKEN_EARNED_EVENT,
  liveSessionChannelName,
  tokenRowToBroadcast,
} from "@/lib/live-realtime";
import type { TokenEarnedBroadcast } from "@/lib/ground-merge";
import type { LiveGroundPayload, Token } from "@/types/database";

type Options = {
  sessionId: string | null;
  participants: LiveGroundPayload["participants"];
  enabled?: boolean;
  /** Broadcast + DB INSERT：即時更新 Ground */
  onTokenEarned: (event: TokenEarnedBroadcast) => void;
  /** 無法解析的 DB 事件時才全量刷新 */
  onNeedsFullReload?: () => void;
};

export function useLiveSessionSync({
  sessionId,
  participants,
  enabled = true,
  onTokenEarned,
  onNeedsFullReload,
}: Options) {
  const onTokenRef = useRef(onTokenEarned);
  const onReloadRef = useRef(onNeedsFullReload);
  const participantsRef = useRef(participants);

  useEffect(() => {
    onTokenRef.current = onTokenEarned;
  }, [onTokenEarned]);

  useEffect(() => {
    onReloadRef.current = onNeedsFullReload;
  }, [onNeedsFullReload]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const channel = supabase.channel(liveSessionChannelName(sessionId));

    channel.on(
      "broadcast",
      { event: LIVE_TOKEN_EARNED_EVENT },
      ({ payload }) => {
        const event = payload as TokenEarnedBroadcast;
        if (event?.sessionId === sessionId) {
          onTokenRef.current(event);
        }
      }
    );

    const handleDbInsert = (row: Token) => {
      if (row.session_id && row.session_id !== sessionId) return;

      const participant = participantsRef.current.find(
        (p) => p.user_id === row.user_id
      );
      if (!participant) {
        onReloadRef.current?.();
        return;
      }

      onTokenRef.current(
        tokenRowToBroadcast(row, {
          sessionId,
          runnerId: participant.runner_id,
          displayName: participant.display_name,
        })
      );
    };

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "tokens",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        handleDbInsert(payload.new as Token);
      }
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, enabled]);
}
