/** 由 earned 時間戳推回掃描先後（與 LIVE 名單一致） */
export function earnedTokenIdsInScanOrder(
  earned: Record<string, string | null>
): string[] {
  return Object.entries(earned)
    .filter((entry): entry is [string, string] => entry[1] != null)
    .sort(
      (a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime()
    )
    .map(([id]) => id);
}
