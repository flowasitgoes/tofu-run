import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { Token } from "@/types/database";
import type { TokenEarnedBroadcast } from "@/lib/ground-merge";

export const LIVE_TOKEN_EARNED_EVENT = "token_earned";

export function liveSessionChannelName(sessionId: string) {
  return `live-session:${sessionId}`;
}

/** 掃描成功後立刻廣播（WebSocket），Ground 不必等 DB + 重拉 API */
export function publishTokenEarned(event: TokenEarnedBroadcast): void {
  const supabase = getSupabaseBrowser();
  if (!supabase) return;

  const channel = supabase.channel(liveSessionChannelName(event.sessionId));
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      void channel.send({
        type: "broadcast",
        event: LIVE_TOKEN_EARNED_EVENT,
        payload: event,
      });
    }
  });
  window.setTimeout(() => {
    void supabase.removeChannel(channel);
  }, 2000);
}

export function tokenRowToBroadcast(
  token: Token,
  meta: {
    sessionId: string;
    runnerId: string;
    displayName: string;
  }
): TokenEarnedBroadcast {
  return {
    sessionId: meta.sessionId,
    tokenId: token.id,
    userId: token.user_id,
    runnerId: meta.runnerId,
    displayName: meta.displayName,
    tokenType: token.token_type,
    scannedAt: token.scanned_at,
  };
}
