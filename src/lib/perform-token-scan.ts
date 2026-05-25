import { getCurrentPositionForScan } from "@/lib/geolocation";
import { publishTokenEarned } from "@/lib/live-realtime";

export const SCAN_API_TIMEOUT_MS = 12_000;

export type PerformTokenScanResult = {
  scannedAt: string;
  sessionId: string;
  tokenType: string;
};

export async function performTokenScan(params: {
  userId: string;
  runnerId: string;
  runnerName: string;
  tokenType: string;
}): Promise<PerformTokenScanResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    SCAN_API_TIMEOUT_MS
  );

  let res: Response;
  try {
    res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        userId: params.userId,
        tokenType: params.tokenType,
        lat: null,
        lng: null,
      }),
    });
  } catch (e) {
    if (controller.signal.aborted) {
      throw new Error("SCAN_TIMEOUT");
    }
    throw e;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "SCAN_FAILED"
    );
  }

  void getCurrentPositionForScan();

  const scannedAt =
    (data.scannedAt as string | undefined) ??
    (data.token?.scanned_at as string | undefined) ??
    new Date().toISOString();

  const sessionId = data.sessionId as string | undefined;
  const token = data.token as
    | { id: string; token_type: string; scanned_at: string }
    | undefined;

  if (sessionId && token) {
    publishTokenEarned({
      sessionId,
      tokenId: token.id,
      userId: params.userId,
      runnerId: params.runnerId,
      displayName: params.runnerName,
      tokenType: token.token_type,
      scannedAt: token.scanned_at,
    });
  }

  return {
    scannedAt,
    sessionId: sessionId ?? "",
    tokenType: params.tokenType,
  };
}
