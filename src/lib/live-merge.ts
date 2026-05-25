import { TOKEN_TYPES } from "@/lib/constants";
import type { GroundFeedItem, LiveParticipant } from "@/types/database";
import type { TokenEarnedBroadcast } from "@/lib/ground-merge";

const FEED_MAX = 30;
const TOKEN_IDS = new Set<string>(TOKEN_TYPES.map((t) => t.id));

/** 最新動態：掃描時間愈晚愈上面 */
export function sortFeedNewestFirst(feed: GroundFeedItem[]): GroundFeedItem[] {
  return [...feed].sort(
    (a, b) =>
      new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
  );
}

/** 掃描廣播：名單 Token 次數即時 +1（含重複掃同一種） */
export function mergeTokenIntoLiveParticipants(
  participants: LiveParticipant[],
  event: TokenEarnedBroadcast
): LiveParticipant[] {
  if (!TOKEN_IDS.has(event.tokenType)) return participants;
  return participants.map((p) => {
    if (p.user_id !== event.userId) return p;
    const earned_token_ids = [...(p.earned_token_ids ?? []), event.tokenType];
    const required = p.required_token_ids ?? [];
    const is_complete =
      required.length > 0 &&
      required.every((id) => earned_token_ids.includes(id));
    const completed_at =
      is_complete && !p.is_complete
        ? event.scannedAt
        : p.completed_at ?? (is_complete ? event.scannedAt : null);

    return {
      ...p,
      earned_token_ids,
      is_complete,
      completed_at,
    };
  });
}

/** 掃描廣播：最新動態置頂（不打 API） */
export function prependLiveFeedItem(
  feed: GroundFeedItem[],
  event: TokenEarnedBroadcast
): GroundFeedItem[] {
  const item: GroundFeedItem = {
    id: event.tokenId,
    user_id: event.userId,
    runner_id: event.runnerId,
    display_name: event.displayName,
    token_type: event.tokenType,
    scanned_at: event.scannedAt,
  };
  return [item, ...feed.filter((f) => f.id !== event.tokenId)].slice(
    0,
    FEED_MAX
  );
}
