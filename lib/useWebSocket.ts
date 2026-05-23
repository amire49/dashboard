import { useCallback, useEffect, useRef, useState } from "react";
import { getAccessToken } from "./auth";

// Resolved at build time; falls back to the known production host.
// Set NEXT_PUBLIC_WS_URL in .env.local for dev / staging overrides.
const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "wss://eras-api.onrender.com";

// Client-side keepalive: send a ping every 30 s to prevent proxy idle-timeouts.
const HEARTBEAT_INTERVAL_MS = 30_000;

// Only emit debug logs in development builds.
const devLog =
  process.env.NODE_ENV === "development"
    ? (...args: unknown[]) => console.log("[WS]", ...args)
    : () => {};

// ── Backend WebSocket message shapes ─────────────────────────────────────────
//
// New (real) format:  { event: "incident.new" | "incident.update" | ..., ...payload }
// Legacy format:      { type: "incident_created" | ..., incident: {...} }
// Housekeeping:       { type: "ping" } / { type: "pong" }

export type BackendIncidentPayload = {
  incident_id?: string;
  id?: string;
  /** category on the wire is called "type" */
  type?: string;
  category?: string;
  status?: string;
  location?: {
    latitude?: number | string | null;
    longitude?: number | string | null;
    address?: string;
  };
  latitude?: number | string | null;
  longitude?: number | string | null;
  address_line?: string;
  description?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  reporter?: { id: string; full_name: string; phone: string } | null;
  assigned_station?: unknown;
  confidence?: number | null;
  amharic_text?: string;
  english_text?: string;
  audio_url?: string;
  is_read?: boolean;
  is_new?: boolean;
};

export type BackendWSMessage =
  | ({ event: "incident.new" } & BackendIncidentPayload)
  | ({ event: "incident.update" | "incident.status_changed" } & BackendIncidentPayload)
  | { event: "ping" | "pong" }
  | { type: "incident_created"; incident: unknown }
  | { type: "incident_updated" | "incident_status_changed"; incident: unknown }
  | { type: "ping" | "pong" };

// ── Hook options / return ─────────────────────────────────────────────────────

type WebSocketHookOptions<T> = {
  onMessage?: (message: T) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enabled?: boolean;
};

type WebSocketHookReturn<T> = {
  isConnected: boolean;
  lastMessage: T | null;
  connectionError: string | null;
  sendMessage: (message: unknown) => void;
  reconnect: () => void;
  disconnect: () => void;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWebSocket<T = Record<string, unknown>>(
  endpoint: string,
  options: WebSocketHookOptions<T> = {}
): WebSocketHookReturn<T> {
  const {
    autoReconnect = true,
    reconnectInterval = 5_000,
    maxReconnectAttempts = 10,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // All mutable values in refs — no stale-closure risk inside WS event handlers.
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldConnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const mountedRef = useRef(false);

  // "Latest ref" pattern: sync options into a ref every render so WS callbacks
  // always read the freshest version without needing to be recreated.
  const optsRef = useRef(options);
  optsRef.current = options;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const endpointRef = useRef(endpoint);
  endpointRef.current = endpoint;

  // ── Heartbeat ──────────────────────────────────────────────────────────────

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
        devLog("heartbeat ping");
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [stopHeartbeat]);

  // ── Core connect ──────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!mountedRef.current) return;
    if (!enabledRef.current) return;
    if (isConnectingRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Remove stale connection.
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const token = getAccessToken();
    if (!token) {
      setConnectionError("Authentication required");
      return;
    }

    try {
      isConnectingRef.current = true;

      const ep = endpointRef.current;
      // NOTE: The backend authenticates via ?token= query param because browsers
      // cannot set custom headers on WebSocket connections. Migrating to
      // first-message auth requires a coordinated backend change.
      const wsUrl = ep.startsWith("ws://") || ep.startsWith("wss://")
        ? `${ep}?token=${token}`
        : `${WS_BASE_URL}${ep}?token=${token}`;

      devLog("connecting (attempt", reconnectAttemptsRef.current + 1, ")");

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        devLog("connected");
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        startHeartbeat();
        optsRef.current.onConnect?.();
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as T;
          // Silently swallow housekeeping pong frames.
          const raw = msg as Record<string, unknown>;
          if (raw.type === "pong" || raw.event === "pong") return;
          devLog("message:", raw.type ?? (raw as Record<string, unknown>).event);
          setLastMessage(msg);
          optsRef.current.onMessage?.(msg);
        } catch {
          // Non-JSON frames — ignore silently.
        }
      };

      ws.onerror = (error: Event) => {
        isConnectingRef.current = false;
        optsRef.current.onError?.(error);
      };

      ws.onclose = () => {
        setIsConnected(false);
        isConnectingRef.current = false;
        wsRef.current = null;
        stopHeartbeat();
        optsRef.current.onDisconnect?.();

        const {
          autoReconnect: ar = true,
          reconnectInterval: ri = 5_000,
          maxReconnectAttempts: max = 10,
        } = optsRef.current;

        if (ar && shouldConnectRef.current && enabledRef.current) {
          reconnectAttemptsRef.current += 1;
          const attempts = reconnectAttemptsRef.current;

          if (attempts <= max) {
            // Exponential back-off with jitter to prevent thundering herd:
            //   delay = min(interval × 2^(attempt-1), 30 s) + random(0–1 s)
            const base = Math.min(ri * Math.pow(2, attempts - 1), 30_000);
            const delay = base + Math.random() * 1_000;
            setConnectionError(`Reconnecting… (${attempts}/${max})`);
            devLog(`reconnect in ${Math.round(delay / 1000)}s`);
            reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
          } else {
            setConnectionError("Connection unavailable. Please refresh the page.");
          }
        }
      };
    } catch (err) {
      isConnectingRef.current = false;
      setConnectionError("Failed to connect");
      devLog("connection error:", err);
    }
  }, [startHeartbeat, stopHeartbeat]);
  // `connect` is intentionally stable (no option deps) — option changes are
  // picked up via optsRef inside the event handlers.

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    isConnectingRef.current = false;
    stopHeartbeat();

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionError(null);
  }, [stopHeartbeat]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      devLog("sent:", message);
    }
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      disconnect();
      return;
    }

    shouldConnectRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
    // Reconnect only when the `enabled` flag toggles.
    // `connect` / `disconnect` are stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Reconnect immediately when the user returns to a backgrounded tab.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!enabledRef.current) return;
      const ws = wsRef.current;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        reconnectAttemptsRef.current = 0;
        shouldConnectRef.current = true;
        connect();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [connect]);

  return { isConnected, lastMessage, connectionError, sendMessage, reconnect: connect, disconnect };
}
