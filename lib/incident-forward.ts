import type { Incident, Station } from "@/types";

/** Matches POST /api/operator/incidents/{id}/forward/ `target` field. */
export type ForwardTarget =
  | "nearest_same"
  | "nearest_police"
  | "nearest_medical"
  | "nearest_fire"
  | "station";

export const FORWARD_REASON_LABELS: Record<string, string> = {
  wrong_location: "Wrong location / address",
  wrong_station_type: "Wrong service type",
  capacity: "Station at capacity",
  other: "Other",
};

export function reasonLabelToText(key: string): string {
  return FORWARD_REASON_LABELS[key] ?? key;
}

export function preferredNearestTarget(category: string): ForwardTarget {
  const c = category?.toLowerCase() ?? "";
  if (c === "fire") return "nearest_fire";
  if (c === "medical") return "nearest_medical";
  if (c === "police" || c === "crime") return "nearest_police";
  return "nearest_same";
}

function stationCoords(station: Station): [number, number] | null {
  const lat = Number(station.latitude ?? station.lat);
  const lng = Number(station.longitude ?? station.long);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
}

function incidentCoords(incident: Incident): [number, number] | null {
  if (incident.latitude == null || incident.longitude == null) return null;
  const lat = Number(incident.latitude);
  const lng = Number(incident.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Sort stations for picker UI (excludes current assignment). */
export function rankStationsForPicker(
  incident: Incident,
  stations: Station[]
): (Station & { distance_km: number })[] {
  const coords = incidentCoords(incident);
  const currentId = incident.assigned_station?.id;

  return stations
    .filter((s) => (s.is_active ?? true) && s.id !== currentId)
    .map((station) => {
      const sc = stationCoords(station);
      const distance_km =
        coords && sc ? haversineKm(coords, sc) : 999;
      return { ...station, distance_km };
    })
    .sort((a, b) => a.distance_km - b.distance_km);
}

export const NEAREST_TARGET_OPTIONS: {
  value: ForwardTarget;
  label: string;
}[] = [
  { value: "nearest_same", label: "Nearest (same service type)" },
  { value: "nearest_police", label: "Nearest police station" },
  { value: "nearest_medical", label: "Nearest medical station" },
  { value: "nearest_fire", label: "Nearest fire station" },
];
