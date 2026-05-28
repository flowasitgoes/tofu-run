"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TRAIL_MAX_ACCURACY_M,
  TRAIL_MIN_MOVE_M,
  TRAIL_UPLOAD_INTERVAL_MS,
  TRAIL_UPLOAD_MAX_POINTS,
  TRAIL_UPLOAD_MIN_POINTS,
  type TrailPointPayload,
} from "@/lib/location-trail";
import { haversineMeters } from "@/lib/distance";
import {
  appendTrailPoint,
  getTrailPendingCount,
  prependTrailPoints,
  takeTrailBatch,
} from "@/lib/location-trail-store";
import { uploadTrailBatch } from "@/lib/location-trail-upload";

export type LiveTrailStatus =
  | "idle"
  | "recording"
  | "paused"
  | "denied"
  | "unsupported";

type UseLiveLocationTrailOptions = {
  enabled: boolean;
  userId: string | null;
  sessionId: string | null;
  runnerId: string | null;
};

export function useLiveLocationTrail({
  enabled,
  userId,
  sessionId,
  runnerId,
}: UseLiveLocationTrailOptions) {
  const [status, setStatus] = useState<LiveTrailStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const lastAcceptedRef = useRef<{ lat: number; lng: number } | null>(null);
  const uploadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadingRef = useRef(false);
  const sessionClosedRef = useRef(false);
  const visibleRef = useRef(true);

  const refreshPendingCount = useCallback(async () => {
    if (!sessionId || !userId) {
      setPendingCount(0);
      return;
    }
    try {
      const n = await getTrailPendingCount(sessionId, userId);
      setPendingCount(n);
    } catch {
      /* ignore */
    }
  }, [sessionId, userId]);

  const flushUpload = useCallback(async () => {
    if (
      !enabled ||
      !userId ||
      !sessionId ||
      !runnerId ||
      uploadingRef.current ||
      sessionClosedRef.current
    ) {
      return;
    }

    uploadingRef.current = true;
    try {
      let batch = await takeTrailBatch(sessionId, userId, TRAIL_UPLOAD_MAX_POINTS);
      while (batch.length > 0) {
        const result = await uploadTrailBatch(runnerId, userId, sessionId, batch);
        if (!result.ok) {
          await prependTrailPoints(sessionId, userId, batch);
          if (result.sessionClosed) sessionClosedRef.current = true;
          break;
        }
        batch = await takeTrailBatch(sessionId, userId, TRAIL_UPLOAD_MAX_POINTS);
      }
    } finally {
      uploadingRef.current = false;
      await refreshPendingCount();
    }
  }, [enabled, userId, sessionId, runnerId, refreshPendingCount]);

  const maybeScheduleUpload = useCallback(async () => {
    if (!sessionId || !userId || sessionClosedRef.current) return;
    const count = await getTrailPendingCount(sessionId, userId);
    setPendingCount(count);
    if (count >= TRAIL_UPLOAD_MIN_POINTS) {
      void flushUpload();
    }
  }, [sessionId, userId, flushUpload]);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const acceptPosition = useCallback(
    (pos: GeolocationPosition) => {
      if (!sessionId || !userId || sessionClosedRef.current) return;

      const accuracy = pos.coords.accuracy;
      if (Number.isFinite(accuracy) && accuracy > TRAIL_MAX_ACCURACY_M) {
        return;
      }

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const last = lastAcceptedRef.current;

      if (last) {
        const moved = haversineMeters(last.lat, last.lng, lat, lng);
        if (moved < TRAIL_MIN_MOVE_M) return;
      }

      lastAcceptedRef.current = { lat, lng };
      const point: TrailPointPayload = {
        clientPointId: crypto.randomUUID(),
        recordedAt: new Date(pos.timestamp).toISOString(),
        lat,
        lng,
        accuracyM: Number.isFinite(accuracy) ? accuracy : null,
      };

      void appendTrailPoint(sessionId, userId, point)
        .then(() => maybeScheduleUpload())
        .catch(() => {});
    },
    [sessionId, userId, maybeScheduleUpload]
  );

  const startWatch = useCallback(() => {
    if (
      typeof window === "undefined" ||
      !navigator.geolocation ||
      !enabled ||
      !userId ||
      !sessionId ||
      !runnerId ||
      sessionClosedRef.current ||
      !visibleRef.current
    ) {
      if (typeof window !== "undefined" && !navigator.geolocation) {
        setStatus("unsupported");
      }
      return;
    }

    clearWatch();
    setStatus("recording");

    watchIdRef.current = navigator.geolocation.watchPosition(
      acceptPosition,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          clearWatch();
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 10_000,
      }
    );
  }, [
    enabled,
    userId,
    sessionId,
    runnerId,
    clearWatch,
    acceptPosition,
  ]);

  const pauseWatch = useCallback(() => {
    clearWatch();
    setStatus((s) => (s === "recording" ? "paused" : s));
  }, [clearWatch]);

  useEffect(() => {
    sessionClosedRef.current = false;
    lastAcceptedRef.current = null;
  }, [sessionId, userId]);

  useEffect(() => {
    if (!enabled || !userId || !sessionId || !runnerId) {
      clearWatch();
      setStatus("idle");
      return;
    }

    startWatch();
    void refreshPendingCount();

    uploadTimerRef.current = setInterval(() => {
      void flushUpload();
    }, TRAIL_UPLOAD_INTERVAL_MS);

    const onVisibility = () => {
      visibleRef.current = document.visibilityState === "visible";
      if (visibleRef.current) {
        startWatch();
        void flushUpload();
      } else {
        pauseWatch();
        setStatus("paused");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (uploadTimerRef.current) {
        clearInterval(uploadTimerRef.current);
        uploadTimerRef.current = null;
      }
      clearWatch();
      void flushUpload();
    };
  }, [
    enabled,
    userId,
    sessionId,
    runnerId,
    startWatch,
    pauseWatch,
    clearWatch,
    flushUpload,
    refreshPendingCount,
  ]);

  return { status, pendingCount };
}
