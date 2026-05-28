import { getCheckpointLocation } from "@/lib/checkpoint-locations";

function toRadians(v: number): number {
  return (v * Math.PI) / 180;
}

export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const earthRadiusM = 6371000;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(aLat)) *
      Math.cos(toRadians(bLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

export function cumulativeDistanceFromTokenIds(tokenIds: string[]): number {
  let total = 0;
  let prev: { lat: number; lng: number } | null = null;
  for (const id of tokenIds) {
    const loc = getCheckpointLocation(id);
    if (!loc) continue;
    if (prev) {
      total += haversineMeters(prev.lat, prev.lng, loc.lat, loc.lng);
    }
    prev = loc;
  }
  return total;
}
