"use client";

import { useEffect, useRef } from "react";
import type { Incident } from "@/types";

// Status → marker color
const STATUS_COLOR: Record<string, string> = {
  routed:      "#ef4444",
  in_progress: "#eab308",
  resolved:    "#22c55e",
};

function markerColor(status: string): string {
  return STATUS_COLOR[status.toLowerCase().replace(/\s+/g, "_")] ?? "#6b7280";
}

function makeSvgIcon(color: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>`.trim();
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

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

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import so this never runs on the server
    import("leaflet").then((L) => {
      // Fix default icon asset paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [9.0, 38.75], // Addis Ababa default
        zoom: 7,
        zoomControl: true,
      });

      // Hybrid layer (Satellite + Labels) - always active
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: '© <a href="https://www.esri.com/">Esri</a>',
          maxZoom: 19,
        }
      ).addTo(map);

      // Add labels overlay
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
        }
      ).addTo(map);

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers whenever incidents change
  useEffect(() => {
    if (!mapRef.current) {
      // Map not ready yet — retry after a tick
      const t = setTimeout(() => {}, 200);
      return () => clearTimeout(t);
    }

    import("leaflet").then((L) => {
      // Remove old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const withCoords = incidents.filter(
        (i) => i.latitude != null && i.longitude != null
      );

      withCoords.forEach((incident) => {
        const color = markerColor(incident.status);
        const icon = L.icon({
          iconUrl: makeSvgIcon(color),
          iconSize: [28, 36],
          iconAnchor: [14, 36],
          popupAnchor: [0, -36],
        });

        const marker = L.marker(
          [Number(incident.latitude), Number(incident.longitude)],
          { icon }
        );

        const statusLabel =
          incident.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        marker.bindPopup(`
          <div style="min-width:160px;font-family:sans-serif;font-size:13px">
            <div style="font-weight:700;text-transform:capitalize;margin-bottom:4px">
              ${incident.category} Incident
            </div>
            <div style="margin-bottom:2px;color:#555">${incident.reporter?.full_name || "—"}</div>
            <span style="
              display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;
              font-weight:600;background:${color}22;color:${color};border:1px solid ${color}66
            ">${statusLabel}</span>
          </div>
        `);

        marker.on("click", () => onSelect(incident));
        marker.addTo(mapRef.current);
        markersRef.current.push(marker);
      });

      // Fit bounds if we have markers
      if (withCoords.length > 0) {
        const bounds = L.latLngBounds(
          withCoords.map((i) => [Number(i.latitude), Number(i.longitude)])
        );
        mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents]);

  // Pan to selected marker
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const incident = incidents.find((i) => i.id === selectedId);
    if (!incident || incident.latitude == null || incident.longitude == null) return;
    mapRef.current.setView([Number(incident.latitude), Number(incident.longitude)], 14, {
      animate: true,
    });
  }, [selectedId, incidents]);

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </>
  );
}
