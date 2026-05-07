"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Search, Filter, X, Building2, Activity, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Station } from "@/types";

// Station type colors and icons
const STATION_CONFIG = {
  police: { color: "#7c3aed", icon: "🚔", label: "Police" },
  medical: { color: "#059669", icon: "🏥", label: "Medical" },
  fire: { color: "#ef4444", icon: "🚒", label: "Fire" },
};

interface Props {
  stations: Station[];
}

export default function EnhancedStationsMap({ stations }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["police", "medical", "fire"]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter stations
  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      const matchesType = selectedTypes.includes(station.type.toLowerCase());
      const matchesSearch = searchQuery === "" || 
        station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [stations, selectedTypes, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = stations.length;
    const byType = {
      medical: stations.filter(s => s.type === "medical").length,
      police: stations.filter(s => s.type === "police").length,
      fire: stations.filter(s => s.type === "fire").length,
    };
    const online = stations.filter(s => s.is_active).length;
    const offline = total - online;
    return { total, byType, online, offline };
  }, [stations]);

  // Toggle type filter
  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Zoom to station
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

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    import("leaflet").then((L) => {
      if (!mounted || mapRef.current || !containerRef.current) return;
      
      const container = containerRef.current;
      if ((container as any)._leaflet_id) return;

      try {
        const Leaflet = L.default || L;
        
        // Create map
        const map = Leaflet.map(container, {
          center: [9.0, 38.75],
          zoom: 7,
          zoomControl: true,
          preferCanvas: true,
        });

        // Add tile layer
        Leaflet.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '© OpenStreetMap, © CARTO',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
        setMapLoaded(true);
      } catch (err) {
        console.error("Error initializing map:", err);
      }
    }).catch(err => {
      console.error("Error loading Leaflet:", err);
    });

    return () => {
      mounted = false;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
      if (containerRef.current) {
        delete (containerRef.current as any)._leaflet_id;
      }
      markersMapRef.current.clear();
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    import("leaflet").then((L) => {
      const Leaflet = L.default || L;
      
      // Clear existing markers
      markersMapRef.current.forEach(marker => {
        try {
          marker.remove();
        } catch (e) {}
      });
      markersMapRef.current.clear();

      filteredStations.forEach((station) => {
        const config = STATION_CONFIG[station.type.toLowerCase() as keyof typeof STATION_CONFIG] || STATION_CONFIG.police;
        const lat = Number(station.lat ?? station.latitude ?? 0);
        const lng = Number(station.long ?? station.longitude ?? 0);
        
        const iconHtml = `
          <div style="
            width: 40px;
            height: 40px;
            background: ${config.color};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            border: 3px solid white;
            position: relative;
          ">
            <span style="font-size: 18px; transform: rotate(45deg);">${config.icon}</span>
            ${!station.is_active ? '<div style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background: #ef4444; border: 2px solid white; border-radius: 50%; transform: rotate(45deg);"></div>' : ''}
          </div>
        `;

        const icon = Leaflet.divIcon({
          html: iconHtml,
          className: 'custom-marker-wrapper',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
        });

        const marker = Leaflet.marker([lat, lng], { icon });

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif;">
            <div style="padding: 12px; background: ${config.color}; color: white; margin: -15px -20px 10px -20px; border-radius: 12px 12px 0 0;">
              <div style="font-size: 24px; margin-bottom: 4px;">${config.icon}</div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700;">${station.name}</h3>
              <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">
                ${config.label} • ${station.is_active ? '🟢 Active' : '🔴 Offline'}
              </div>
            </div>
            <div style="padding: 0 4px;">
              <div style="margin-bottom: 8px;">
                <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: #6b7280; margin-bottom: 2px;">Location</div>
                <div style="font-size: 13px;">${station.address}, ${station.city}</div>
              </div>
              <div style="margin-bottom: 8px;">
                <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: #6b7280; margin-bottom: 2px;">Contact</div>
                <div style="font-size: 13px;">
                  📞 <a href="tel:${station.phone}">${station.phone}</a><br/>
                  ✉️ <a href="mailto:${station.email}">${station.email}</a>
                </div>
              </div>
              <div style="text-align: center; padding: 12px; background: #f9fafb; border-radius: 8px; border: 2px solid ${config.color}; margin-bottom: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: ${config.color};">${station.capacity}</div>
                <div style="font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Personnel Capacity</div>
              </div>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" 
                 target="_blank" 
                 style="display: block; width: 100%; padding: 10px; border-radius: 8px; background: ${config.color}; color: white; text-align: center; font-weight: 600; font-size: 13px; text-decoration: none;">
                🧭 Get Directions
              </a>
            </div>
          </div>
        `, {
          maxWidth: 300,
        });

        marker.addTo(mapRef.current);
        markersMapRef.current.set(station.id, marker);
      });

      // Fit bounds
      if (filteredStations.length > 0 && mapRef.current) {
        const bounds = Leaflet.latLngBounds(
          filteredStations.map((s) => [
            Number(s.lat ?? s.latitude ?? 0),
            Number(s.long ?? s.longitude ?? 0)
          ])
        );
        mapRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 11 });
      }
    });
  }, [filteredStations, mapLoaded]);

  return (
    <div className="relative w-full h-full flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white/95 backdrop-blur-lg border-r border-gray-200 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Stations</h3>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search stations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Filters */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filters</div>
            {Object.entries(STATION_CONFIG).map(([type, config]) => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  selectedTypes.includes(type)
                    ? 'bg-gray-100 border-2'
                    : 'bg-white border-2 border-transparent opacity-50'
                }`}
                style={{ borderColor: selectedTypes.includes(type) ? config.color : 'transparent' }}
              >
                <span className="text-lg">{config.icon}</span>
                <span className="flex-1 text-left text-sm font-medium">{config.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {stats.byType[type as keyof typeof stats.byType]}
                </Badge>
              </button>
            ))}
          </div>
        </div>
        
        {/* Station List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Stations ({filteredStations.length})
          </div>
          {filteredStations.map((station) => {
            const config = STATION_CONFIG[station.type.toLowerCase() as keyof typeof STATION_CONFIG];
            return (
              <button
                key={station.id}
                onClick={() => zoomToStation(station)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                  selectedStation?.id === station.id
                    ? 'bg-gray-50 border-gray-300'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{config.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{station.name}</div>
                    <div className="text-xs text-gray-500 truncate">{station.city}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {station.is_active ? (
                        <span className="text-xs text-green-600">🟢 Active</span>
                      ) : (
                        <span className="text-xs text-gray-400">🔴 Offline</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {/* Toggle Sidebar Button */}
        {!sidebarOpen && (
          <Button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-[1000] shadow-lg"
            size="sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        )}

        {/* Statistics Cards */}
        <div className="absolute top-4 right-4 z-[1000] flex gap-3">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-gray-500">Total Stations</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.online}</div>
                <div className="text-xs text-gray-500">Online</div>
              </div>
            </div>
          </div>
          
          {stats.offline > 0 && (
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                  <WifiOff className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.offline}</div>
                  <div className="text-xs text-gray-500">Offline</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div ref={containerRef} className="w-full h-full" style={{ minHeight: '600px' }} />
      </div>
    </div>
  );
}
