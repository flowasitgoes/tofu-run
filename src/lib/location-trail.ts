/** Phase 1 LIVE 軌跡錄製常數（與掃描 GPS 分開） */

export const TRAIL_MIN_MOVE_M = 20;
export const TRAIL_UPLOAD_INTERVAL_MS = 60_000;
export const TRAIL_UPLOAD_MIN_POINTS = 15;
export const TRAIL_UPLOAD_MAX_POINTS = 50;
export const TRAIL_MAX_ACCURACY_M = 80;

export type TrailPointPayload = {
  clientPointId: string;
  recordedAt: string;
  lat: number;
  lng: number;
  accuracyM: number | null;
};

export type TrailUploadBody = {
  runnerId: string;
  userId: string;
  sessionId: string;
  points: TrailPointPayload[];
};
