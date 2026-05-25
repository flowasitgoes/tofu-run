export type GeoPosition = {
  lat: number;
  lng: number;
};

export type GeoOptions = {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
};

export function getCurrentPosition(
  options?: GeoOptions
): Promise<GeoPosition | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
  } = options ?? {};

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy, timeout, maximumAge }
    );
  });
}

/** 掃描背景同步用：不擋 UI，逾時較短、不強制高精度 */
export function getCurrentPositionForScan(): Promise<GeoPosition | null> {
  return getCurrentPosition({
    enableHighAccuracy: false,
    timeout: 2000,
    maximumAge: 120_000,
  });
}
