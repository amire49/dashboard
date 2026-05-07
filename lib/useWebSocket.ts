import { useEffect, useRef, useState, useCallback } from "react";
import { getAccessToken } from "./auth";

// Convert HTTP(S) URL to WS(S) URL
const getWebSocketUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://eras-api.onrender.com";
  return apiUrl.replace("https://", "wss://").replace("http://", "ws://");
};

const WS_BASE_URL = getWebSocketUrl();

export type WebSocketMessage = {
  type: "incident_created" | "incident_updated" | "incident_status_changed" | "station_updated" | "operator_updated" | "ping" | "pong";
  data?: unknown;
  incident?: unknown;
  station?: unknown;
  operator?: unknown;
  message?: string;
  timestamp?: string;
};

type WebSocketHookOptions = {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  enabled?: boolean; // Allow disabling the connection
};

export function useWebSocket(endpoint: string, options: WebSocketHookOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = getAccessToken();
    if (!token) {
      console.warn("No access token available for WebSocket connection");
      setConnectionError("Authentication required");
      return;
    }

    try {
      // Construct WebSocket URL with token
      // Try multiple possible endpoint formats
      const wsUrl = `${WS_BASE_URL}${endpoint}?token=${token}`;
      console.log("Connecting to WebSocket:", wsUrl.replace(token, "***"));

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log("📨 WebSocket message received:", message.type, message);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        // Silently handle WebSocket errors - they're expected if backend WS isn't ready
        setConnectionError("Connection error");
        onError?.(error);
      };

      ws.onclose = (event) => {
        // Only log if it was an unexpected close (not a normal close)
        if (event.code !== 1000) {
          console.log("🔌 WebSocket disconnected", event.code, event.reason || "No reason provided");
        }
        setIsConnected(false);
        wsRef.current = null;
        onDisconnect?.();

        // Auto-reconnect if enabled and should still be connected
        if (autoReconnect && shouldConnectRef.current && enabled) {
          reconnectAttemptsRef.current += 1;
          
          if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
            const delay = Math.min(reconnectInterval * reconnectAttemptsRef.current, 30000);
            console.log(`🔄 Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            setConnectionError(`Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            console.error("❌ Max reconnection attempts reached");
            setConnectionError("Connection failed. Please refresh the page.");
          }
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setConnectionError("Failed to connect");
    }
  }, [endpoint, onMessage, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval, enabled]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionError(null);
  }, []);

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log("📤 WebSocket message sent:", message);
    } else {
      console.warn("WebSocket is not connected. Cannot send message.");
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }

    shouldConnectRef.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  return {
    isConnected,
    lastMessage,
    connectionError,
    sendMessage,
    reconnect: connect,
    disconnect,
  };
}
