"use client";

import { useEffect, useRef } from "react";
import { themeColor } from "@/lib/status-styles";

interface Props {
  lat: number;
  lng: number;
}

export default function InlineMap({ lat, lng }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;

    let mounted = true;

    import("leaflet").then((L) => {
      if (!mounted || !ref.current || mapRef.current) return;

      const container = ref.current;
      if ((container as { _leaflet_id?: number })._leaflet_id) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(container, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: '© <a href="https://www.esri.com/">Esri</a>',
          maxZoom: 19,
        }
      ).addTo(map);

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 }
      ).addTo(map);

      const pinColor = themeColor("primary");

      L.circleMarker([lat, lng], {
        radius: 14,
        color: pinColor,
        fillColor: pinColor,
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      L.circleMarker([lat, lng], {
        radius: 6,
        color: pinColor,
        fillColor: pinColor,
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (ref.current) {
        delete (ref.current as { _leaflet_id?: number })._leaflet_id;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={ref} className="h-full w-full" />
    </>
  );
}
