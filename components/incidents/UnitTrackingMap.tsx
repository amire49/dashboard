"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconCar, IconLoader2, IconMapPin } from "@tabler/icons-react";
import { incidentsAPI } from "@/lib/api";
import {
  addDefaultStreetTiles,
  createIncidentPin,
  createUnitPin,
  drawRoute,
  fixLeafletDefaultIcons,
} from "@/lib/leaflet-map-shared";
import {
  fetchDrivingRoute,
  formatRouteSummary,
  shouldRefetchRoute,
  type LatLng,
  type RouteResult,
} from "@/lib/map-routing";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeLayerRef = useRef<any>(null);
  const lastRouteFromRef = useRef<LatLng | null>(null);
  const lastRouteFetchAtRef = useRef(0);
  const lastRouteResultRef = useRef<RouteResult | null>(null);
  const routeRequestIdRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState<UnitLocationPing | null>(null);
  const [error, setError] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeSummary, setRouteSummary] = useState<string | null>(null);
  const [routeApproximate, setRouteApproximate] = useState(false);

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

  const applyRouteToMap = useCallback((map: any, L: any, result: RouteResult) => {
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    routeLayerRef.current = drawRoute(map, L, result.coordinates, {
      dashArray: result.isApproximate ? "8 8" : undefined,
    });

    const bounds = L.latLngBounds(result.coordinates);
    map.fitBounds(bounds.pad(0.2));

    setRouteSummary(formatRouteSummary(result.distanceM, result.durationSec));
    setRouteApproximate(result.isApproximate);
  }, []);

  const updateRoute = useCallback(
    async (map: any, L: any, unit: LatLng) => {
      const incident: LatLng = { lat: incidentLat, lng: incidentLng };

      if (
        lastRouteResultRef.current &&
        !shouldRefetchRoute(
          lastRouteFromRef.current,
          unit,
          lastRouteFetchAtRef.current
        )
      ) {
        applyRouteToMap(map, L, lastRouteResultRef.current);
        return;
      }

      const requestId = ++routeRequestIdRef.current;
      setRouteLoading(true);

      const result: RouteResult = await fetchDrivingRoute(unit, incident);
      if (requestId !== routeRequestIdRef.current || !leafletMapRef.current) {
        return;
      }

      lastRouteResultRef.current = result;
      applyRouteToMap(map, L, result);
      setRouteLoading(false);
      lastRouteFromRef.current = unit;
      lastRouteFetchAtRef.current = Date.now();
    },
    [incidentLat, incidentLng, applyRouteToMap]
  );

  useEffect(() => {
    if (!mapRef.current || !enabled) return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      if (!leafletMapRef.current) {
        fixLeafletDefaultIcons(L);

        const map = L.map(mapRef.current, {
          center: [incidentLat, incidentLng],
          zoom: 14,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        addDefaultStreetTiles(map, L);
        leafletMapRef.current = map;
      }

      const map = leafletMapRef.current;

      if (markersRef.current.incident) {
        map.removeLayer(markersRef.current.incident);
      }
      markersRef.current.incident = L.marker([incidentLat, incidentLng], {
        icon: createIncidentPin(L),
      }).addTo(map);

      if (markersRef.current.unit) {
        map.removeLayer(markersRef.current.unit);
        markersRef.current.unit = undefined;
      }

      if (unitLocation) {
        const ulat = Number(unitLocation.latitude);
        const ulng = Number(unitLocation.longitude);
        if (!Number.isNaN(ulat) && !Number.isNaN(ulng)) {
          markersRef.current.unit = L.marker([ulat, ulng], {
            icon: createUnitPin(L),
          }).addTo(map);

          void updateRoute(map, L, { lat: ulat, lng: ulng });
        }
      } else {
        if (routeLayerRef.current) {
          map.removeLayer(routeLayerRef.current);
          routeLayerRef.current = null;
        }
        lastRouteResultRef.current = null;
        lastRouteFromRef.current = null;
        setRouteSummary(null);
        setRouteApproximate(false);
        map.setView([incidentLat, incidentLng], 14);
      }
    });
  }, [enabled, incidentLat, incidentLng, unitLocation, updateRoute]);

  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markersRef.current = {};
        routeLayerRef.current = null;
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
        style={{ height: 280, borderColor: "var(--border)" }}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">
            <IconLoader2 size={20} stroke={1.5} className="animate-spin" />
          </div>
        )}

        {routeLoading && unitLocation && !loading && (
          <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-md">
            Calculating route…
          </div>
        )}

        {routeSummary && unitLocation && !routeLoading && (
          <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-foreground shadow-md">
            <IconCar size={14} stroke={1.5} className="text-[#4285F4]" />
            {routeSummary}
            {routeApproximate && (
              <span className="font-normal text-muted-foreground">(approx.)</span>
            )}
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
