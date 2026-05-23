"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconLoader2, IconMapPin } from "@tabler/icons-react";
import { incidentsAPI } from "@/lib/api";
import type { UnitLocationPing } from "@/types";

type Props = {
  incidentId: string;
  incidentLat: number;
  incidentLng: number;
  /** Live location from WebSocket `unit.location_update`. */
  liveLocation?: UnitLocationPing | null;
  enabled?: boolean;
};

const POLL_MS = 60_000;

export default function UnitTrackingMap({
  incidentId,
  incidentLat,
  incidentLng,
  liveLocation,
  enabled = true,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<{ incident?: any; unit?: any }>({});

  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState<UnitLocationPing | null>(null);
  const [error, setError] = useState(false);

  const fetchTracking = useCallback(async () => {
    if (!enabled || !incidentId) return;
    const res = await incidentsAPI.getUnitTracking(incidentId);
    if (res?.latest_location) {
      setLatest(res.latest_location);
      setError(false);
    } else if (res) {
      setLatest(null);
      setError(false);
    } else {
      setError(true);
    }
    setLoading(false);
  }, [enabled, incidentId]);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    fetchTracking();
    const t = setInterval(fetchTracking, POLL_MS);
    return () => clearInterval(t);
  }, [enabled, fetchTracking]);

  const unitLocation = liveLocation ?? latest;

  useEffect(() => {
    if (!mapRef.current || !enabled) return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      if (!leafletMapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        const map = L.map(mapRef.current, {
          center: [incidentLat, incidentLng],
          zoom: 14,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { attribution: '© <a href="https://www.esri.com/">Esri</a>', maxZoom: 19 }
        ).addTo(map);

        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          { maxZoom: 19 }
        ).addTo(map);

        leafletMapRef.current = map;
      }

      const map = leafletMapRef.current;

      if (markersRef.current.incident) {
        map.removeLayer(markersRef.current.incident);
      }
      markersRef.current.incident = L.circleMarker([incidentLat, incidentLng], {
        radius: 8,
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 0.85,
        weight: 2,
      }).addTo(map);

      if (markersRef.current.unit) {
        map.removeLayer(markersRef.current.unit);
        markersRef.current.unit = undefined;
      }

      if (unitLocation) {
        const ulat = Number(unitLocation.latitude);
        const ulng = Number(unitLocation.longitude);
        if (!Number.isNaN(ulat) && !Number.isNaN(ulng)) {
          markersRef.current.unit = L.circleMarker([ulat, ulng], {
            radius: 8,
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.85,
            weight: 2,
          }).addTo(map);

          const bounds = L.latLngBounds(
            [incidentLat, incidentLng],
            [ulat, ulng]
          );
          map.fitBounds(bounds.pad(0.25));
        }
      } else {
        map.setView([incidentLat, incidentLng], 14);
      }
    });
  }, [enabled, incidentLat, incidentLng, unitLocation]);

  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markersRef.current = {};
      }
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <IconMapPin size={14} stroke={1.5} />
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1" />
          Incident
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mx-1 ml-2" />
          Unit
        </span>
        {unitLocation?.recorded_at && (
          <span className="ml-auto font-mono text-[10px]">
            Updated {new Date(unitLocation.recorded_at).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div
        className="relative overflow-hidden rounded-xl border"
        style={{ height: 200, borderColor: "var(--border)" }}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">
            <IconLoader2 size={20} stroke={1.5} className="animate-spin" />
          </div>
        )}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {!loading && !unitLocation && !error && (
        <p className="text-xs text-muted-foreground">
          Waiting for unit GPS ping (about every 60s).
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500">Could not load unit tracking.</p>
      )}
    </div>
  );
}
