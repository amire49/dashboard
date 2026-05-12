"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocket } from "./useWebSocket";
import { useToast } from "./useToast";
import { incidentsAPI } from "./api";
import type { BackendIncidentPayload, BackendWSMessage } from "./useWebSocket";
import type { Incident } from "@/types";

// ── Payload → Incident mapper ─────────────────────────────────────────────────
//
// The backend WebSocket payload uses different field names than the REST API
// Incident shape. This function normalises them into a consistent Incident.

function mapPayload(p: BackendIncidentPayload): Incident {
  return {
    id: p.incident_id ?? p.id ?? "",
    category: p.type ?? p.category ?? "unknown",
    status: p.status ?? "routed",
    latitude: p.location?.latitude ?? p.latitude ?? null,
    longitude: p.location?.longitude ?? p.longitude ?? null,
    address_line: p.location?.address ?? p.address_line,
    notes: p.description ?? p.notes,
    created_at: p.created_at ?? new Date().toISOString(),
    updated_at: p.updated_at,
    reporter: p.reporter ?? null,
    confidence: p.confidence ?? null,
    amharic_text: p.amharic_text,
    english_text: p.english_text,
    audio_url: p.audio_url,
    assigned_station: p.assigned_station as Incident["assigned_station"] ?? null,
  };
}

// ── Notification helpers ──────────────────────────────────────────────────────

function playNotificationSound() {
  if (typeof window === "undefined" || !("Audio" in window)) return;
  const audio = new Audio("/notification.mp3");
  // Browser autoplay policies may block this without a prior user gesture.
  audio.play().catch(() => {/* silently ignored */});
}

function fireBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  const show = () => {
    try {
      new Notification(title, { body, icon: "/favicon.svg" });
    } catch {
      // Some browsers restrict Notification in certain contexts — ignore.
    }
  };

  if (Notification.permission === "granted") {
    show();
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") show();
    });
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export type UseIncidentSocketOptions = {
  /**
   * When false, skips REST fetch and WebSocket until true (e.g. wait for auth).
   */
  enabled?: boolean;
  /**
   * Called whenever an existing incident is updated via WebSocket.
   * Use this to sync derived UI state (e.g. the selected / detail panel).
   */
  onIncidentUpdated?: (incident: Incident) => void;
};

export type UseIncidentSocketReturn = {
  incidents: Incident[];
  setIncidents: React.Dispatch<React.SetStateAction<Incident[]>>;
  loading: boolean;
  fetchError: boolean;
  isConnected: boolean;
  connectionError: string | null;
  /** Re-fetch the full incidents list from the REST API. */
  refresh: () => void;
};

export function useIncidentSocket(
  options: UseIncidentSocketOptions = {}
): UseIncidentSocketReturn {
  const enabled = options.enabled ?? true;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const { success, info } = useToast();

  // Tracks which incident IDs have already triggered a notification so we
  // never fire duplicate toasts / sounds for the same incident.
  const notifiedRef = useRef<Set<string>>(new Set());

  // Prevents the "reconnected" toast from firing on the very first connect.
  const isInitialConnectRef = useRef(true);

  // Keep options in a ref so the WS message handler always sees the latest
  // callbacks without needing to be recreated on every render.
  const optsRef = useRef(options);
  optsRef.current = options;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // ── REST fetch ──────────────────────────────────────────────────────────────

  const fetchIncidents = useCallback(async (silent = false) => {
    if (!enabledRef.current) return;
    if (!silent) setLoading(true);
    setFetchError(false);
    const res = await incidentsAPI.list();
    if (res === null) {
      setFetchError(true);
    } else {
      setIncidents(res.data ?? []);
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Stay in loading state until auth is ready — avoids a one-frame empty list.
      return;
    }
    fetchIncidents();
  }, [enabled, fetchIncidents]);

  // ── WS message handler ─────────────────────────────────────────────────────

  const handleMessage = useCallback(
    (msg: BackendWSMessage) => {
      if ("event" in msg) {
        // ── New-format messages ────────────────────────────────────────────

        if (msg.event === "incident.new") {
          const incident = mapPayload(msg as BackendIncidentPayload);

          setIncidents((prev) => {
            if (prev.some((i) => i.id === incident.id)) return prev;
            return [incident, ...prev];
          });

          if (!notifiedRef.current.has(incident.id)) {
            notifiedRef.current.add(incident.id);
            const cat = incident.category?.toUpperCase() ?? "EMERGENCY";
            success("New Incident", `${cat} incident reported`);
            playNotificationSound();
            fireBrowserNotification(
              "New Emergency Incident",
              `${cat} incident reported`
            );
          }
          return;
        }

        if (
          msg.event === "incident.update" ||
          msg.event === "incident.status_changed"
        ) {
          const incident = mapPayload(msg as BackendIncidentPayload);
          setIncidents((prev) => {
            const idx = prev.findIndex((i) => i.id === incident.id);
            if (idx === -1) return [incident, ...prev];
            return prev.map((i) => (i.id === incident.id ? incident : i));
          });
          info(
            "Incident Updated",
            `Status: ${incident.status?.toUpperCase() ?? "UPDATED"}`
          );
          optsRef.current.onIncidentUpdated?.(incident);
          return;
        }
      }

      if ("type" in msg) {
        // ── Legacy-format messages ─────────────────────────────────────────

        if (msg.type === "incident_created") {
          const incident = (msg as { type: string; incident: Incident }).incident;
          setIncidents((prev) => {
            if (prev.some((i) => i.id === incident.id)) return prev;
            return [incident, ...prev];
          });
          if (!notifiedRef.current.has(incident.id)) {
            notifiedRef.current.add(incident.id);
            const cat = incident.category?.toUpperCase() ?? "EMERGENCY";
            success("New Incident", `${cat} incident reported`);
            playNotificationSound();
            fireBrowserNotification("New Emergency Incident", `${cat} incident reported`);
          }
          return;
        }

        if (
          msg.type === "incident_updated" ||
          msg.type === "incident_status_changed"
        ) {
          const incident = (msg as { type: string; incident: Incident }).incident;
          setIncidents((prev) => {
            const idx = prev.findIndex((i) => i.id === incident.id);
            if (idx === -1) return [incident, ...prev];
            return prev.map((i) => (i.id === incident.id ? incident : i));
          });
          info(
            "Incident Updated",
            `Status: ${incident.status?.toUpperCase() ?? "UPDATED"}`
          );
          optsRef.current.onIncidentUpdated?.(incident);
          return;
        }
      }
    },
    [success, info]
  );

  // ── WebSocket connection ────────────────────────────────────────────────────

  const { isConnected, connectionError } = useWebSocket<BackendWSMessage>(
    "/ws/operators/incidents/",
    {
      enabled,
      autoReconnect: true,
      reconnectInterval: 5_000,

      onConnect() {
        if (!enabledRef.current) return;
        if (!isInitialConnectRef.current) {
          // Silently re-sync the list in case we missed messages during dropout.
          fetchIncidents(true);
          info("Connected", "Real-time updates enabled");
        }
        isInitialConnectRef.current = false;
      },

      onMessage: handleMessage,
    }
  );

  return {
    incidents,
    setIncidents,
    loading,
    fetchError,
    isConnected,
    connectionError,
    refresh: () => fetchIncidents(),
  };
}
