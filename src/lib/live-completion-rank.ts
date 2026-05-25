import type { LiveParticipant } from "@/types/database";

type RankInput = Pick<
  LiveParticipant,
  "user_id" | "is_complete" | "completed_at" | "joined_at"
>;

/** 依完成時間先後排名（越早完成名次愈前，第 1 名最快） */
export function buildCompletionRanks(
  participants: RankInput[]
): Map<string, number> {
  const completers = participants
    .filter((p) => p.is_complete && p.completed_at)
    .sort((a, b) => {
      const byComplete =
        new Date(a.completed_at!).getTime() -
        new Date(b.completed_at!).getTime();
      if (byComplete !== 0) return byComplete;
      return (
        new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
      );
    });

  const ranks = new Map<string, number>();
  completers.forEach((p, index) => {
    ranks.set(p.user_id, index + 1);
  });
  return ranks;
}
