"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Search,
  Filter,
  X,
  Building2,
  Activity,
  WifiOff,
  Satellite,
  Map as MapIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  STAT_CARD_VARIANTS,
  stationTypeColor,
  stationTypeStyle,
  themeColor,
} from "@/lib/status-styles";
import { cn } from "@/lib/utils";
import type { Station } from "@/types";

const STATION_TYPES = ["police", "medical", "fire"] as const;

interface Props {
  stations: Station[];
}

export default function EnhancedStationsMap({ stations }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const tileLayerRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([...STATION_TYPES]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);

  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      const matchesType = selectedTypes.includes(station.type.toLowerCase());
      const matchesSearch =
        searchQuery === "" ||
        station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [stations, selectedTypes, searchQuery]);

  const stats = useMemo(() => {
    const total = stations.length;
    const byType = {
      medical: stations.filter((s) => s.type === "medical").length,
      police: stations.filter((s) => s.type === "police").length,
      fire: stations.filter((s) => s.type === "fire").length,
    };
    const online = stations.filter((s) => s.is_active).length;
    const offline = total - online;
    return { total, byType, online, offline };
  }, [stations]);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleSatellite = () => {
    if (!mapRef.current || !tileLayerRef.current) return;

    import("leaflet").then((L) => {
      const Leaflet = L.default || L;

      if (tileLayerRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current);
      }

      const newTileLayer = !isSatellite
        ? Leaflet.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            { attribution: "© Esri, Maxar, Earthstar Geographics", maxZoom: 19 }
          ).addTo(mapRef.current)
        : Leaflet.tileLayer(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            { attribution: "© OpenStreetMap, © CARTO", maxZoom: 19 }
          ).addTo(mapRef.current);

      tileLayerRef.current = newTileLayer;
      setIsSatellite(!isSatellite);
    });
  };

  const zoomToStation = (station: Station) => {
    if (!mapRef.current) return;
    const lat = Number(station.lat ?? station.latitude ?? 0);
    const lng = Number(station.long ?? station.longitude ?? 0);
    mapRef.current.setView([lat, lng], 14, { animate: true });

    const marker = markersMapRef.current.get(station.id);
    if (marker) {
      marker.openPopup();
    }
    setSelectedStation(station);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    import("leaflet").then((L) => {
      if (!mounted || mapRef.current || !containerRef.current) return;

      const container = containerRef.current;
      if ((container as any)._leaflet_id) return;

      try {
        const Leaflet = L.default || L;

        const map = Leaflet.map(container, {
          center: [9.0, 38.75],
          zoom: 7,
          zoomControl: true,
          preferCanvas: true,
        });

        const tileLayer = Leaflet.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          { attribution: "© OpenStreetMap, © CARTO", maxZoom: 19 }
        ).addTo(map);

        tileLayerRef.current = tileLayer;
        mapRef.current = map;
        setMapLoaded(true);
      } catch (err) {
        console.error("Error initializing map:", err);
      }
    }).catch((err) => {
      console.error("Error loading Leaflet:", err);
    });

    return () => {
      mounted = false;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* ignore cleanup errors */
        }
        mapRef.current = null;
      }
      if (containerRef.current) {
        delete (containerRef.current as any)._leaflet_id;
      }
      markersMapRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    import("leaflet").then((L) => {
      const Leaflet = L.default || L;

      markersMapRef.current.forEach((marker) => {
        try {
          marker.remove();
        } catch {
          /* ignore cleanup errors */
        }
      });
      markersMapRef.current.clear();

      const offlineColor = themeColor("destructive");

      filteredStations.forEach((station) => {
        const cfg = stationTypeStyle(station.type);
        const color = stationTypeColor(station.type);
        const lat = Number(station.lat ?? station.latitude ?? 0);
        const lng = Number(station.long ?? station.longitude ?? 0);

        const iconHtml = `
          <div style="
            width: 40px;
            height: 40px;
            background: ${color};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            border: 3px solid white;
            position: relative;
          ">
            <span style="font-size: 14px; font-weight: 700; color: white; transform: rotate(45deg);">${cfg.label.charAt(0)}</span>
            ${!station.is_active ? `<motion.div style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background: ${offlineColor}; border: 2px solid white; border-radius: 50%; transform: rotate(45deg);"></motion.div>` : ""}
          </motion.div>
        `.replace(/<\/?motion\./g, (m) => m.replace("motion.", ""));

        const icon = Leaflet.divIcon({
          html: iconHtml,
          className: "custom-marker-wrapper",
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
        });

        const marker = Leaflet.marker([lat, lng], { icon });

        marker.bindPopup(
          `
          <motion.div style="font-family: system-ui, sans-serif;">
            <motion.div style="padding: 12px; background: ${color}; color: white; margin: -15px -20px 10px -20px; border-radius: 12px 12px 0 0;">
              <h3 style="margin: 0; font-size: 16px; font-weight: 700;">${station.name}</h3>
              <motion.div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">
                ${cfg.label} • ${station.is_active ? "Active" : "Inactive"}
              </motion.div>
            </motion.div>
            <motion.div style="padding: 0 4px;">
              <motion.div style="margin-bottom: 8px;">
                <motion.div style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 2px;">Location</motion.div>
                <motion.div style="font-size: 13px;">${station.address}, ${station.city}</motion.div>
              </motion.div>
              <motion.div style="margin-bottom: 8px;">
                <motion.div style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 2px;">Contact</motion.div>
                <motion.div style="font-size: 13px;">
                  <a href="tel:${station.phone}">${station.phone}</a><br/>
                  <a href="mailto:${station.email}">${station.email}</a>
                </motion.div>
              </motion.div>
              <motion.div style="text-align: center; padding: 12px; background: var(--surface-subtle); border-radius: 8px; border: 2px solid ${color}; margin-bottom: 8px;">
                <motion.div style="font-size: 24px; font-weight: 700; color: ${color};">${station.capacity}</motion.div>
                <motion.div style="font-size: 10px; text-transform: uppercase; color: var(--muted-foreground); font-weight: 600;">Personnel Capacity</motion.div>
              </motion.div>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}"
                 target="_blank"
                 style="display: block; width: 100%; padding: 10px; border-radius: 8px; background: ${color}; color: white; text-align: center; font-weight: 600; font-size: 13px; text-decoration: none;">
                Get Directions
              </a>
            </motion.div>
          </motion.div>
        `.replace(/<\/?motion\./g, (m) => m.replace("motion.", "")),
          { maxWidth: 300 }
        );

        marker.addTo(mapRef.current);
        markersMapRef.current.set(station.id, marker);
      });

      if (filteredStations.length > 0 && mapRef.current) {
        const bounds = Leaflet.latLngBounds(
          filteredStations.map((s) => [
            Number(s.lat ?? s.latitude ?? 0),
            Number(s.long ?? s.longitude ?? 0),
          ])
        );
        mapRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 11 });
      }
    });
  }, [filteredStations, mapLoaded]);

  const totalVariant = STAT_CARD_VARIANTS.info;
  const onlineVariant = STAT_CARD_VARIANTS.success;
  const offlineVariant = STAT_CARD_VARIANTS.danger;

  return (
    <div className="relative flex h-full w-full">
      <div
        className={cn(
          "flex flex-col overflow-hidden border-r border-border bg-card/95 backdrop-blur-lg transition-all duration-300",
          sidebarOpen ? "w-80" : "w-0"
        )}
      >
        <div className="border-b border-border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-section-title">Stations</h3>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>

          <div className="relative mb-4">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <Input
              placeholder="Search stations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2">
            <div className="text-label mb-2">Filters</div>
            {STATION_TYPES.map((type) => {
              const cfg = stationTypeStyle(type);
              const Icon = cfg.icon;
              const selected = selectedTypes.includes(type);

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all",
                    selected
                      ? cn("bg-muted/50", cfg.border)
                      : "border-transparent bg-card opacity-50"
                  )}
                >
                  <Icon className={cn("h-4 w-4", cfg.text)} strokeWidth={1.75} />
                  <span className="flex-1 text-left text-sm font-medium">{cfg.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {stats.byType[type]}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          <div className="text-label mb-2">Stations ({filteredStations.length})</div>
          {filteredStations.map((station) => {
            const cfg = stationTypeStyle(station.type);
            const Icon = cfg.icon;

            return (
              <button
                key={station.id}
                type="button"
                onClick={() => zoomToStation(station)}
                className={cn(
                  "w-full rounded-xl border-2 p-3 text-left transition-all hover:shadow-card",
                  selectedStation?.id === station.id
                    ? "border-border bg-muted/50"
                    : "border-border/50 bg-card hover:border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      cfg.bg,
                      cfg.text
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{station.name}</div>
                    <div className="truncate text-caption">{station.city}</div>
                    <div className="mt-1 flex items-center gap-2">
                      {station.is_active ? (
                        <span className="text-xs font-medium text-success">Active</span>
                      ) : (
                        <span className="text-caption">Inactive</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative flex-1">
        {!sidebarOpen && (
          <Button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-4 z-[1000] shadow-card"
            size="sm"
          >
            <Filter className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Filters
          </Button>
        )}

        <div className="absolute right-4 top-4 z-[1000] flex gap-3">
          <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-card backdrop-blur-lg">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  totalVariant.iconBg
                )}
              >
                <Building2 className={cn("h-5 w-5", totalVariant.iconColor)} strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-caption">Total Stations</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-card backdrop-blur-lg">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  onlineVariant.iconBg
                )}
              >
                <Activity className={cn("h-5 w-5", onlineVariant.iconColor)} strokeWidth={1.75} />
              </div>
              <div>
                <div className={cn("text-2xl font-bold", onlineVariant.iconColor)}>
                  {stats.online}
                </div>
                <div className="text-caption">Online</div>
              </div>
            </div>
          </div>

          {stats.offline > 0 && (
            <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-card backdrop-blur-lg">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    offlineVariant.iconBg
                  )}
                >
                  <WifiOff className={cn("h-5 w-5", offlineVariant.iconColor)} strokeWidth={1.75} />
                </div>
                <div>
                  <div className={cn("text-2xl font-bold", offlineVariant.iconColor)}>
                    {stats.offline}
                  </div>
                  <div className="text-caption">Offline</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={toggleSatellite}
          className="absolute bottom-4 right-4 z-[1000] border border-border bg-card/90 shadow-card backdrop-blur-lg hover:bg-card"
          size="sm"
          variant="outline"
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

        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div ref={containerRef} className="h-full w-full" style={{ minHeight: "600px" }} />
      </div>
    </div>
  );
}
