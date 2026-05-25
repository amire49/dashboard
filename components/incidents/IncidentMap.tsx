"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapIcon, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addDefaultStreetTiles,
  addSatelliteTiles,
  createIncidentPin,
  fixLeafletDefaultIcons,
} from "@/lib/leaflet-map-shared";
import { incidentStatusColor, incidentStatusStyle } from "@/lib/status-styles";
import type { Incident } from "@/types";

interface Props {
  incidents: Incident[];
  onSelect: (incident: Incident) => void;
  selectedId?: string | null;
}

export default function IncidentMap({ incidents, onSelect, selectedId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);
  const [isSatellite, setIsSatellite] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    import("leaflet").then((L) => {
      if (!mounted || mapRef.current || !containerRef.current) return;

      const container = containerRef.current;
      if ((container as { _leaflet_id?: number })._leaflet_id) return;
      const Leaflet = L.default || L;

      fixLeafletDefaultIcons(Leaflet);

      const map = Leaflet.map(container, {
        center: [9.0, 38.75],
        zoom: 7,
        zoomControl: true,
        preferCanvas: true,
      });

      tileLayerRef.current = addDefaultStreetTiles(map, Leaflet);

      mapRef.current = map;
    });

    return () => {
      mounted = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      tileLayerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (containerRef.current) {
        delete (containerRef.current as { _leaflet_id?: number })._leaflet_id;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    import("leaflet").then((L) => {
      const Leaflet = L.default || L;
      const map = mapRef.current;

      if (!map) return;

      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      tileLayerRef.current = isSatellite
        ? addSatelliteTiles(map, Leaflet)
        : addDefaultStreetTiles(map, Leaflet);
    });
  }, [isSatellite]);

  useEffect(() => {
    if (!mapRef.current) {
      const t = setTimeout(() => {}, 200);
      return () => clearTimeout(t);
    }

    import("leaflet").then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const withCoords = incidents.filter(
        (i) => i.latitude != null && i.longitude != null
      );

      withCoords.forEach((incident) => {
        const color = incidentStatusColor(incident.status);
        const statusCfg = incidentStatusStyle(incident.status);
        const icon = createIncidentPin(L, color);

        const marker = L.marker(
          [Number(incident.latitude), Number(incident.longitude)],
          { icon }
        );

        marker.bindPopup(`
          <div class="min-w-[160px] font-sans text-body">
            <div class="mb-1 font-bold capitalize">
              ${incident.category} Incident
            </div>
            <div class="mb-0.5 text-muted-foreground">${incident.reporter?.full_name || "—"}</div>
            <span class="inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style="background:${color}22;color:${color};border-color:${color}66">
              ${statusCfg.label}
            </span>
          </div>
        `);

        marker.on("click", () => onSelect(incident));
        marker.addTo(mapRef.current);
        markersRef.current.push(marker);
      });

      if (withCoords.length > 0) {
        const bounds = L.latLngBounds(
          withCoords.map((i) => [Number(i.latitude), Number(i.longitude)])
        );
        mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents]);

  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const incident = incidents.find((i) => i.id === selectedId);
    if (!incident || incident.latitude == null || incident.longitude == null) return;
    mapRef.current.setView([Number(incident.latitude), Number(incident.longitude)], 14, {
      animate: true,
    });
  }, [selectedId, incidents]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute right-4 top-4 z-[1000]">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsSatellite((value) => !value)}
          className="border border-border bg-card/90 shadow-card backdrop-blur-lg hover:bg-card"
        >
          {isSatellite ? (
            <>
              <MapIcon className="mr-2 h-4 w-4" strokeWidth={1.75} />
              <span className="text-foreground">Map View</span>
            </>
          ) : (
            <>
              <Satellite className="mr-2 h-4 w-4" strokeWidth={1.75} />
              <span className="text-foreground">Satellite</span>
            </>
          )}
        </Button>
      </div>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
