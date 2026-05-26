import { SCANNABLE_TOKEN_IDS } from "@/lib/constants";
import { routeMeetsCompletion } from "@/lib/ground-completion";
import type { GroundFeedItem, LiveGroundPayload } from "@/types/database";

const TOKEN_IDS = new Set<string>(SCANNABLE_TOKEN_IDS);

export type TokenEarnedBroadcast = {
  sessionId: string;
  tokenId: string;
  userId: string;
  runnerId: string;
  displayName: string;
  tokenType: string;
  scannedAt: string;
};

/** 將單筆 Token 即時合進 Ground 狀態（不打 API） */
export function mergeTokenIntoGround(
  payload: LiveGroundPayload,
  event: TokenEarnedBroadcast
): LiveGroundPayload {
  if (payload.sessionId !== event.sessionId) return payload;
  if (!TOKEN_IDS.has(event.tokenType)) return payload;

  const participants = payload.participants.map((row) => {
    if (row.user_id !== event.userId) return row;
    const earned = { ...row.earned };
    let earned_token_ids = row.earned_token_ids;
    if (!earned[event.tokenType]) {
      earned[event.tokenType] = event.scannedAt;
    }
    earned_token_ids = [...earned_token_ids, event.tokenType];
    const isComplete = routeMeetsCompletion(
      row.requiredTokenIds,
      earned_token_ids
    );
    const completedAt =
      isComplete && !row.completedAt ? event.scannedAt : row.completedAt;
    return { ...row, earned, earned_token_ids, isComplete, completedAt };
  });

  const feedItem: GroundFeedItem = {
    id: event.tokenId,
    user_id: event.userId,
    runner_id: event.runnerId,
    display_name: event.displayName,
    token_type: event.tokenType,
    scanned_at: event.scannedAt,
  };

  const feed = [
    feedItem,
    ...payload.feed.filter((f) => f.id !== event.tokenId),
  ].slice(0, 30);

  return { ...payload, participants, feed };
}
