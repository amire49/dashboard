export type LatLng = { lat: number; lng: number };

export type RouteResult = {
  coordinates: [number, number][];
  distanceM: number;
  durationSec: number;
  isApproximate: boolean;
};

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function straightLineFallback(from: LatLng, to: LatLng): RouteResult {
  const distanceM = haversineM(from, to);
  const avgSpeedMps = 11.1; // ~40 km/h urban driving estimate
  return {
    coordinates: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    distanceM,
    durationSec: distanceM / avgSpeedMps,
    isApproximate: true,
  };
}

export function formatRouteSummary(distanceM: number, durationSec: number): string {
  const minutes = Math.max(1, Math.round(durationSec / 60));
  const km = distanceM / 1000;
  const distance =
    km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
  return `${minutes} min · ${distance}`;
}

export function shouldRefetchRoute(
  prev: LatLng | null,
  next: LatLng,
  lastFetchAt: number,
  minIntervalMs = 30_000,
  minMoveM = 100
): boolean {
  if (!prev) return true;
  if (Date.now() - lastFetchAt >= minIntervalMs) return true;
  return haversineM(prev, next) >= minMoveM;
}

export async function fetchDrivingRoute(
  from: LatLng,
  to: LatLng
): Promise<RouteResult> {
  const url =
    `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}` +
    "?overview=full&geometries=geojson";

  try {
    const res = await fetch(url);
    if (!res.ok) return straightLineFallback(from, to);

    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
      }>;
    };

    const route = data.routes?.[0];
    const geoCoords = route?.geometry?.coordinates;
    if (data.code !== "Ok" || !route || !geoCoords?.length) {
      return straightLineFallback(from, to);
    }

    const coordinates: [number, number][] = geoCoords.map(([lng, lat]) => [
      lat,
      lng,
    ]);

    return {
      coordinates,
      distanceM: route.distance ?? haversineM(from, to),
      durationSec: route.duration ?? haversineM(from, to) / 11.1,
      isApproximate: false,
    };
  } catch {
    return straightLineFallback(from, to);
  }
}
