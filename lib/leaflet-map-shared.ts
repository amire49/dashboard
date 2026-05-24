/* eslint-disable @typescript-eslint/no-explicit-any */

export const ROUTE_COLOR = "#4285F4";

export function fixLeafletDefaultIcons(L: any) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

export function addDefaultStreetTiles(map: any, L: any) {
  return L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {
      attribution: "© OpenStreetMap, © CARTO",
      maxZoom: 19,
    }
  ).addTo(map);
}

export function addSatelliteTiles(map: any, L: any) {
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
}

function svgPinDataUrl(color: string, inner: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      ${inner}
    </svg>`.trim();
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export function createIncidentPin(L: any, color = "#ef4444") {
  return L.icon({
    iconUrl: svgPinDataUrl(color, '<circle cx="14" cy="14" r="5" fill="white"/>'),
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

export function createUnitPin(L: any) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="#4285F4" stroke="white" stroke-width="3"/>
      <circle cx="16" cy="16" r="5" fill="white"/>
    </svg>`.trim();
  const iconUrl =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return L.icon({
    iconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

type DrawRouteOptions = {
  color?: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
};

export function drawRoute(
  map: any,
  L: any,
  coordinates: [number, number][],
  options: DrawRouteOptions = {}
): any {
  return L.polyline(coordinates, {
    color: options.color ?? ROUTE_COLOR,
    weight: options.weight ?? 5,
    opacity: options.opacity ?? 0.9,
    lineCap: "round",
    lineJoin: "round",
    dashArray: options.dashArray,
  }).addTo(map);
}
