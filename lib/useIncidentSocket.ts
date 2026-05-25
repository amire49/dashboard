"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocket } from "./useWebSocket";
import { useToast } from "./useToast";
import { incidentsAPI } from "./api";
import type {
  BackendIncidentPayload,
  BackendUnitAssignedPayload,
  BackendUnitDetachedPayload,
  BackendUnitLocationPayload,
  BackendWSMessage,
} from "./useWebSocket";
import type { AssignedUnitBrief, ForwardAwayInfo, ForwardChainStep, Incident, UnitLocationPing } from "@/types";
import { isUnread, normalizeIncidentStatus } from "./incident-workflow";

// ── Payload → Incident mapper ─────────────────────────────────────────────────

function mapPayload(p: BackendIncidentPayload, existing?: Incident): Incident {
  return {
    id: p.incident_id ?? p.id ?? existing?.id ?? "",
    category: p.type ?? p.category ?? existing?.category ?? "unknown",
    status: p.status ?? existing?.status ?? "routed",
    latitude: p.location?.latitude ?? p.latitude ?? existing?.latitude ?? null,
    longitude: p.location?.longitude ?? p.longitude ?? existing?.longitude ?? null,
    address_line: p.location?.address ?? p.address_line ?? existing?.address_line,
    notes: p.description ?? p.notes ?? existing?.notes,
    created_at: p.created_at ?? existing?.created_at ?? new Date().toISOString(),
    updated_at: p.updated_at ?? existing?.updated_at,
    reporter: p.reporter ?? existing?.reporter ?? null,
    confidence: p.confidence ?? existing?.confidence ?? null,
    language: p.language ?? existing?.language ?? "amharic",
    amharic_text: p.amharic_text ?? existing?.amharic_text,
    english_text: p.english_text ?? existing?.english_text,
    audio_url: p.audio_url ?? existing?.audio_url,
    assigned_station:
      (p.assigned_station as Incident["assigned_station"]) ??
      existing?.assigned_station ??
      null,
    assigned_unit:
      (p.assigned_unit as Incident["assigned_unit"]) ??
      existing?.assigned_unit ??
      null,
    unit_assigned_at:
      p.unit_assigned_at ?? existing?.unit_assigned_at ?? null,
    is_read: p.is_read ?? existing?.is_read,
    is_new: p.is_new ?? existing?.is_new,
    forward_chain:
      (p.forward_chain as ForwardChainStep[] | undefined) ??
      existing?.forward_chain,
    operator_perspective:
      (p.operator_perspective as Incident["operator_perspective"]) ??
      existing?.operator_perspective,
    operator_display_status:
      p.operator_display_status ?? existing?.operator_display_status,
    operator_display_message:
      p.operator_display_message ?? existing?.operator_display_message,
    forward_away_info:
      (p.forward_away_info as ForwardAwayInfo | undefined) ??
      existing?.forward_away_info,
  };
}

function mergeIncidentUpdate(prev: Incident, patch: Incident): Incident {
  return { ...prev, ...patch };
}

function formatIncidentAlert(incident: Incident): {
  title: string;
  description: string;
} {
  const cat = (incident.category ?? "emergency").replace(/_/g, " ");
  const title = `New ${cat.charAt(0).toUpperCase() + cat.slice(1)} report`;
  const parts: string[] = [];
  if (incident.reporter?.full_name) parts.push(incident.reporter.full_name);
  if (incident.address_line) parts.push(incident.address_line);
  else if (incident.assigned_station?.name) {
    parts.push(incident.assigned_station.name);
  }
  const description =
    parts.length > 0 ? parts.join(" · ") : "Requires immediate review";
  return { title, description };
}

function formatStatusLabel(status?: string): string {
  if (!status) return "Updated";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Persist notified IDs across page refresh ──────────────────────────────────

const NOTIFIED_STORAGE_KEY = "eras_notified_incident_ids";
const MAX_STORED_NOTIFIED = 200;

function loadNotifiedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistNotifiedIds(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const arr = [...set].slice(-MAX_STORED_NOTIFIED);
    sessionStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    /* quota / private mode */
  }
}

function incidentIdFromPayload(
  raw: BackendIncidentPayload | Incident
): string {
  return String(
    ("incident_id" in raw && raw.incident_id) ||
      raw.id ||
      ""
  );
}

// ── Notification helpers ──────────────────────────────────────────────────────

function playNotificationSound() {
  if (typeof window === "undefined" || !("Audio" in window)) return;
  const audio = new Audio("/notification.mp3");
  audio.play().catch(() => {/* silently ignored */});
}

function fireBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  const show = () => {
    try {
      new Notification(title, { body, icon: "/favicon.svg" });
    } catch {
      /* restricted context */
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
  enabled?: boolean;
  onIncidentUpdated?: (incident: Incident) => void;
  /** Fired when this station loses the incident (WS `incident.forwarded`). */
  onIncidentForwardedAway?: (incidentId: string) => void;
  /** Live GPS from `unit.location_update`. */
  onUnitLocationUpdate?: (
    incidentId: string,
    location: UnitLocationPing
  ) => void;
};

export type UseIncidentSocketReturn = {
  incidents: Incident[];
  setIncidents: React.Dispatch<React.SetStateAction<Incident[]>>;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  fetchError: boolean;
  isConnected: boolean;
  connectionError: string | null;
  refresh: () => void;
};

export function useIncidentSocket(
  options: UseIncidentSocketOptions = {}
): UseIncidentSocketReturn {
  const enabled = options.enabled ?? true;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const { emergency, info } = useToast();

  const notifiedRef = useRef<Set<string>>(loadNotifiedIds());
  const lastStatusRef = useRef<Map<string, string>>(new Map());
  const incidentsRef = useRef<Incident[]>([]);
  const isInitialConnectRef = useRef(true);
  const reconnectToastAtRef = useRef(0);

  const optsRef = useRef(options);
  optsRef.current = options;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const toastFnsRef = useRef({ emergency, info });
  toastFnsRef.current = { emergency, info };

  useEffect(() => {
    incidentsRef.current = incidents;
    incidents.forEach((i) => {
      lastStatusRef.current.set(i.id, normalizeIncidentStatus(i.status));
    });
  }, [incidents]);

  const seedKnownIncidents = useCallback((rows: Incident[]) => {
    rows.forEach((i) => {
      notifiedRef.current.add(i.id);
      lastStatusRef.current.set(i.id, normalizeIncidentStatus(i.status));
    });
    persistNotifiedIds(notifiedRef.current);
    incidentsRef.current = rows;
  }, []);

  const tryNotifyNewIncident = useCallback((incident: Incident) => {
    const id = incident.id;
    if (!id) return;

    if (incidentsRef.current.some((i) => i.id === id)) return;
    if (notifiedRef.current.has(id)) return;

    notifiedRef.current.add(id);
    persistNotifiedIds(notifiedRef.current);

    const alert = formatIncidentAlert(incident);
    toastFnsRef.current.emergency(alert.title, alert.description);
    playNotificationSound();
    fireBrowserNotification(alert.title, alert.description);
  }, []);

  const tryNotifyStatusChange = useCallback((id: string, status?: string) => {
    if (!id || !status) return;

    const normalized = normalizeIncidentStatus(status);
    const previous = lastStatusRef.current.get(id);

    lastStatusRef.current.set(id, normalized);

    if (!previous || previous === normalized) return;

    const row = incidentsRef.current.find((i) => i.id === id);
    if (row && normalizeIncidentStatus(row.status) === normalized) return;

    toastFnsRef.current.info("Status changed", formatStatusLabel(normalized));
  }, []);

  const fetchIncidents = useCallback(
    async (silent = false) => {
      if (!enabledRef.current) return;
      if (!silent) setLoading(true);
      setFetchError(false);
      const res = await incidentsAPI.list({ scope: "active" });
      if (res === null) {
        setFetchError(true);
      } else {
        const rows = res.data ?? [];
        setIncidents(rows);
        seedKnownIncidents(rows);
        setUnreadCount(
          res.unread_count ?? rows.filter((i) => isUnread(i)).length
        );
      }
      if (!silent) setLoading(false);
    },
    [seedKnownIncidents]
  );

  useEffect(() => {
    if (!enabled) return;
    fetchIncidents();
  }, [enabled, fetchIncidents]);

  const handleMessage = useCallback(
    (msg: BackendWSMessage) => {
      if ("event" in msg) {
        if (msg.event === "incident.new") {
          const raw = msg as BackendIncidentPayload;
          const incident: Incident = {
            ...mapPayload(raw),
            is_new: raw.is_new ?? true,
            is_read: raw.is_read ?? false,
          };
          const id = incident.id;
          const wasInList = incidentsRef.current.some((i) => i.id === id);

          setIncidents((prev) => {
            if (prev.some((i) => i.id === id)) return prev;
            return [incident, ...prev];
          });

          if (!wasInList && isUnread(incident)) {
            setUnreadCount((c) => c + 1);
          }

          tryNotifyNewIncident(incident);
          return;
        }

        if (msg.event === "incident.forwarded") {
          const raw = msg as BackendIncidentPayload;
          const id = incidentIdFromPayload(raw);
          if (!id) return;

          setIncidents((prev) => prev.filter((i) => i.id !== id));
          setUnreadCount((c) => Math.max(0, c - 1));
          optsRef.current.onIncidentForwardedAway?.(id);
          toastFnsRef.current.info(
            "Incident forwarded",
            "Removed from your station queue"
          );
          return;
        }

        if (msg.event === "unit.assigned") {
          const raw = msg as BackendUnitAssignedPayload;
          const id = raw.incident_id;
          if (!id) return;

          const unit =
            (raw.assigned_unit as AssignedUnitBrief | undefined) ??
            (raw.unit as AssignedUnitBrief | undefined) ??
            null;

          setIncidents((prev) => {
            const idx = prev.findIndex((i) => i.id === id);
            if (idx === -1) return prev;
            const merged: Incident = {
              ...prev[idx],
              status: raw.status ?? prev[idx].status,
              assigned_unit: unit,
              unit_assigned_at:
                raw.unit_assigned_at ?? prev[idx].unit_assigned_at ?? null,
            };
            optsRef.current.onIncidentUpdated?.(merged);
            return prev.map((i) => (i.id === id ? merged : i));
          });

          toastFnsRef.current.info(
            "Unit assigned",
            unit?.name ? `${unit.name} dispatched` : "Response unit on incident"
          );
          return;
        }

        if (msg.event === "unit.detached") {
          const raw = msg as BackendUnitDetachedPayload;
          const id = raw.incident_id;
          if (!id) return;

          setIncidents((prev) => {
            const idx = prev.findIndex((i) => i.id === id);
            if (idx === -1) return prev;
            const merged: Incident = {
              ...prev[idx],
              status: raw.status ?? prev[idx].status,
              assigned_unit: null,
              unit_assigned_at: null,
            };
            optsRef.current.onIncidentUpdated?.(merged);
            return prev.map((i) => (i.id === id ? merged : i));
          });

          toastFnsRef.current.info("Unit detached", "Response unit removed");
          return;
        }

        if (msg.event === "unit.location_update") {
          const raw = msg as BackendUnitLocationPayload;
          const id = raw.incident_id;
          const loc = raw.location;
          if (!id || !loc) return;

          const ping: UnitLocationPing = {
            latitude: loc.latitude,
            longitude: loc.longitude,
            location_accuracy_m: loc.location_accuracy_m ?? null,
            recorded_at: loc.recorded_at,
          };

          if (raw.status) {
            setIncidents((prev) => {
              const idx = prev.findIndex((i) => i.id === id);
              if (idx === -1) return prev;
              const merged: Incident = {
                ...prev[idx],
                status: raw.status ?? prev[idx].status,
              };
              optsRef.current.onIncidentUpdated?.(merged);
              return prev.map((i) => (i.id === id ? merged : i));
            });
          }

          optsRef.current.onUnitLocationUpdate?.(id, ping);
          return;
        }

        if (
          msg.event === "incident.update" ||
          msg.event === "incident.status_changed" ||
          msg.event === "incident.status_update"
        ) {
          const raw = msg as BackendIncidentPayload;
          const id = incidentIdFromPayload(raw);
          const status = raw.status;

          setIncidents((prev) => {
            const idx = prev.findIndex((i) => i.id === id);
            if (idx === -1) {
              const incident: Incident = {
                ...mapPayload(raw),
                is_new: raw.is_new ?? false,
                is_read: raw.is_read ?? true,
              };
              optsRef.current.onIncidentUpdated?.(incident);
              return [incident, ...prev];
            }
            const merged = mergeIncidentUpdate(
              prev[idx],
              mapPayload(raw, prev[idx])
            );
            optsRef.current.onIncidentUpdated?.(merged);
            return prev.map((i) => (i.id === merged.id ? merged : i));
          });

          tryNotifyStatusChange(id, status);
          return;
        }
      }

      if ("type" in msg) {
        if (msg.type === "incident_created") {
          const raw = (msg as { type: string; incident: Incident }).incident;
          const incident: Incident = {
            ...raw,
            is_new: raw.is_new ?? true,
            is_read: raw.is_read ?? false,
          };
          const id = incident.id;
          const wasInList = incidentsRef.current.some((i) => i.id === id);

          setIncidents((prev) => {
            if (prev.some((i) => i.id === id)) return prev;
            return [incident, ...prev];
          });

          if (!wasInList && isUnread(incident)) {
            setUnreadCount((c) => c + 1);
          }

          tryNotifyNewIncident(incident);
          return;
        }

        if (
          msg.type === "incident_updated" ||
          msg.type === "incident_status_changed"
        ) {
          const patch = (msg as { type: string; incident: Incident }).incident;
          const id = patch.id;

          setIncidents((prev) => {
            const idx = prev.findIndex((i) => i.id === id);
            if (idx === -1) {
              optsRef.current.onIncidentUpdated?.(patch);
              return [patch, ...prev];
            }
            const merged = mergeIncidentUpdate(prev[idx], patch);
            optsRef.current.onIncidentUpdated?.(merged);
            return prev.map((i) => (i.id === merged.id ? merged : i));
          });

          tryNotifyStatusChange(id, patch.status);
          return;
        }
      }
    },
    [tryNotifyNewIncident, tryNotifyStatusChange]
  );

  const { isConnected, connectionError } = useWebSocket<BackendWSMessage>(
    "/ws/operators/incidents/",
    {
      enabled,
      autoReconnect: true,
      reconnectInterval: 5_000,

      onConnect() {
        if (!enabledRef.current) return;
        if (!isInitialConnectRef.current) {
          fetchIncidents(true);
          const now = Date.now();
          if (now - reconnectToastAtRef.current > 30_000) {
            reconnectToastAtRef.current = now;
            toastFnsRef.current.info(
              "Back online",
              "Live incident updates restored"
            );
          }
        }
        isInitialConnectRef.current = false;
      },

      onMessage: handleMessage,
    }
  );

  return {
    incidents,
    setIncidents,
    unreadCount,
    setUnreadCount,
    loading,
    fetchError,
    isConnected,
    connectionError,
    refresh: () => fetchIncidents(),
  };
}

