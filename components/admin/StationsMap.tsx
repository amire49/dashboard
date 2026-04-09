"use client";

import { useEffect, useRef } from "react";
import type { Station } from "@/types";

// Station type colors
const STATION_COLORS: Record<string, string> = {
  police: "#7c3aed",   // Purple
  medical: "#059669",  // Green
  fire: "#ef4444",     // Red
};

function getStationColor(type: string): string {
  return STATION_COLORS[type.toLowerCase()] ?? "#6b7280";
}

function makeStationIcon(type: string, isActive: boolean): string {
  const color = getStationColor(type);
  const opacity = isActive ? "1" : "0.4";
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="${color}" opacity="${opacity}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>`.trim();
  
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

interface Props {
  stations: Station[];
}

export default function StationsMap({ stations }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then((L) => {
      // Double-check after async import
      if (mapRef.current) return;
      
      // Check if container already has a map instance
      const container = containerRef.current;
      if (!container) return;
      
      // Remove any existing map instance from the container
      if ((container as any)._leaflet_id) {
        return;
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(container, {
        center: [9.0, 38.75], // Addis Ababa default
        zoom: 7,
        zoomControl: true,
      });

      // Hybrid map: Satellite imagery with labels
      // Satellite layer (base)
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: '© Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community',
        maxZoom: 19,
      }).addTo(map);

      // Labels layer (overlay)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
        pane: 'shadowPane'
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      // Also clear the container's leaflet id
      if (containerRef.current) {
        delete (containerRef.current as any)._leaflet_id;
      }
    };
  }, []);

  // Update markers when stations change
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      // Remove old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const validStations = stations.filter(
        (s) => (s.lat != null && s.long != null) || (s.latitude != null && s.longitude != null)
      );

      validStations.forEach((station) => {
        const color = getStationColor(station.type);
        
        // Handle both lat/long and latitude/longitude, and convert strings to numbers
        const lat = Number(station.lat ?? station.latitude ?? 0);
        const lng = Number(station.long ?? station.longitude ?? 0);
        
        const icon = L.icon({
          iconUrl: makeStationIcon(station.type, station.is_active),
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        const marker = L.marker([lat, lng], { icon });

        // Permanent tooltip - always visible (station name + type)
        const permanentTooltipContent = `
          <div style="text-align: center; white-space: nowrap;">
            <div style="font-weight: 700; font-size: 11px; color: #111827; margin-bottom: 2px;">
              ${station.name}
            </div>
            <div style="font-size: 10px; color: ${color}; font-weight: 600; text-transform: capitalize;">
              ${station.type}
            </div>
          </div>
        `;

        const tooltip = marker.bindTooltip(permanentTooltipContent, {
          permanent: true,
          direction: "bottom",
          offset: [0, 12],
          opacity: 1,
          className: "permanent-tooltip",
          interactive: true, // Make tooltip interactive so it can be clicked
        });

        // Add click event to tooltip element after it's created
        // We need to wait for the tooltip to be added to the DOM
        setTimeout(() => {
          const tooltipElement = tooltip.getElement();
          if (tooltipElement) {
            tooltipElement.style.cursor = 'pointer';
            tooltipElement.addEventListener('click', (e) => {
              e.stopPropagation(); // Prevent event bubbling
              marker.openPopup();
            });
          }
        }, 100);

        // Detailed popup on click
        const popupContent = `
          <div style="font-family: system-ui, sans-serif; font-size: 13px; min-width: 280px; max-width: 320px;">
            <div style="background: linear-gradient(135deg, ${color}15 0%, ${color}05 100%); margin: -15px -20px 12px -20px; padding: 16px 20px; border-bottom: 2px solid ${color}30;">
              <div style="font-weight: 700; font-size: 17px; color: #111827; margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
                ${station.name}
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; background: ${color}; color: white; text-transform: capitalize; box-shadow: 0 2px 4px ${color}40;">
                  ${station.type} Station
                </span>
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; background: ${station.is_active ? '#10b981' : '#6b7280'}; color: white;">
                  ${station.is_active ? '✓ Active' : '○ Inactive'}
                </span>
              </div>
            </div>
            
            <div style="color: #374151; font-size: 13px; line-height: 1.7;">
              <div style="margin-bottom: 12px; padding: 10px; background: #f9fafb; border-radius: 8px; border-left: 3px solid ${color};">
                <div style="font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 6px;">
                  � Location
                </div>
                <div style="color: #111827;">
                  ${station.address}<br/>
                  <strong>${station.city}</strong>
                </div>
              </div>
              
              <div style="margin-bottom: 12px; padding: 10px; background: #f9fafb; border-radius: 8px;">
                <div style="font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 6px;">
                  📞 Contact Information
                </div>
                <div style="margin-bottom: 4px;">
                  <strong>Phone:</strong> 
                  <a href="tel:${station.phone}" style="color: ${color}; text-decoration: none; font-family: monospace; font-weight: 600;">${station.phone}</a>
                </div>
                <div>
                  <strong>Email:</strong> 
                  <a href="mailto:${station.email}" style="color: ${color}; text-decoration: none; font-weight: 500;">${station.email}</a>
                </div>
              </div>
              
              <div style="padding: 10px; background: linear-gradient(135deg, ${color}08 0%, ${color}03 100%); border-radius: 8px; border: 1px solid ${color}20; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: ${color}; margin-bottom: 2px;">${station.capacity}</div>
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 600;">Personnel Capacity</div>
              </div>
            </div>
            
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; font-family: monospace;">
              📌 ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 320,
          className: "custom-popup",
        });

        // Open popup and animate on click only
        marker.on('click', function(this: any) {
          this.openPopup();
          // Add scale animation to marker
          const icon = this.getElement();
          if (icon) {
            icon.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            icon.style.transform = 'scale(1.2)';
            icon.style.zIndex = '1000';
          }
        });

        // Reset marker scale when popup closes
        marker.on('popupclose', function(this: any) {
          const icon = this.getElement();
          if (icon) {
            icon.style.transform = 'scale(1)';
            icon.style.zIndex = '';
          }
        });

        // Subtle hover effect without opening popup
        marker.on('mouseover', function(this: any) {
          const icon = this.getElement();
          if (icon && !this.isPopupOpen()) {
            icon.style.transition = 'transform 0.2s ease';
            icon.style.transform = 'scale(1.1)';
          }
        });

        marker.on('mouseout', function(this: any) {
          const icon = this.getElement();
          if (icon && !this.isPopupOpen()) {
            icon.style.transform = 'scale(1)';
          }
        });

        marker.addTo(mapRef.current);
        markersRef.current.push(marker);
      });

      // Fit bounds if we have markers
      if (validStations.length > 0) {
        const bounds = L.latLngBounds(
          validStations.map((s) => {
            const lat = Number(s.lat ?? s.latitude ?? 0);
            const lng = Number(s.long ?? s.longitude ?? 0);
            return [lat, lng];
          })
        );
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    });
  }, [stations]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>{`
        /* Permanent tooltip styles */
        .leaflet-tooltip.permanent-tooltip {
          background: white !important;
          border: none !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
          padding: 6px 10px !important;
          font-family: system-ui, sans-serif !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          cursor: pointer !important;
          pointer-events: auto !important;
        }
        .leaflet-tooltip.permanent-tooltip:hover {
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08) !important;
          transform: translateY(-2px);
        }
        .leaflet-tooltip.permanent-tooltip::before {
          border-top-color: white !important;
        }
        
        /* Marker hover effect */
        .leaflet-marker-icon {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
          cursor: pointer !important;
        }
        .leaflet-marker-icon:hover {
          filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3)) !important;
        }
        
        /* Popup styles */
        .custom-popup .leaflet-popup-content-wrapper {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
          padding: 0;
          overflow: hidden;
          animation: popupFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-popup .leaflet-popup-content {
          margin: 15px 20px;
          font-size: 13px;
          line-height: 1.6;
        }
        .custom-popup .leaflet-popup-tip {
          background: white;
          box-shadow: 0 3px 14px rgba(0, 0, 0, 0.1);
        }
        .custom-popup a.leaflet-popup-close-button {
          color: #9ca3af;
          font-size: 24px;
          padding: 8px 12px;
          transition: all 0.2s ease;
        }
        .custom-popup a.leaflet-popup-close-button:hover {
          color: #ef4444;
          background: #fef2f2;
          border-radius: 8px;
          transform: scale(1.1);
        }
        
        /* Popup animation */
        @keyframes popupFadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* Smooth zoom controls */
        .leaflet-control-zoom a {
          transition: all 0.2s ease !important;
        }
        .leaflet-control-zoom a:hover {
          background: #f3f4f6 !important;
          transform: scale(1.05);
        }
      `}</style>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </>
  );
}
