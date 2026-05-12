import { useEffect, useRef, useState, useCallback } from "react";
import { getAccessToken } from "./auth";

// WebSocket base URL - always use the production endpoint
const WS_BASE_URL = "wss://eras-api.onrender.com";

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
  
  // Use refs for all mutable values and callbacks
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const mountedRef = useRef(false);
  const maxReconnectAttempts = 10;
  
  // Store callbacks in refs to avoid recreating connect function
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);
  const autoReconnectRef = useRef(autoReconnect);
  const reconnectIntervalRef = useRef(reconnectInterval);
  
  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
    autoReconnectRef.current = autoReconnect;
    reconnectIntervalRef.current = reconnectInterval;
  }, [onMessage, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!enabled) return;
    if (!mountedRef.current) return;
    
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      return;
    }
    
    // Check if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    // Close any existing connection before creating a new one
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }

    const token = getAccessToken();
    if (!token) {
      console.warn("No access token available for WebSocket connection");
      setConnectionError("Authentication required");
      return;
    }

    try {
      isConnectingRef.current = true;
      
      // Construct WebSocket URL with token
      let wsUrl: string;
      if (endpoint.startsWith("ws://") || endpoint.startsWith("wss://")) {
        wsUrl = `${endpoint}?token=${token}`;
      } else {
        wsUrl = `${WS_BASE_URL}${endpoint}?token=${token}`;
      }
      
      // Only log connection attempt on first try
      if (reconnectAttemptsRef.current === 0) {
        console.log("Connecting to WebSocket:", wsUrl.replace(token, "***"));
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        onConnectRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log("📨 WebSocket message received:", message.type, message);
          setLastMessage(message);
          onMessageRef.current?.(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        isConnectingRef.current = false;
        onErrorRef.current?.(error);
      };

      ws.onclose = () => {
        setIsConnected(false);
        isConnectingRef.current = false;
        wsRef.current = null;
        onDisconnectRef.current?.();

        // Auto-reconnect if enabled and should still be connected
        if (autoReconnectRef.current && shouldConnectRef.current && enabled) {
          reconnectAttemptsRef.current += 1;
          
          if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
            const delay = Math.min(reconnectIntervalRef.current * reconnectAttemptsRef.current, 30000);
            setConnectionError(`Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setConnectionError("WebSocket unavailable");
          }
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      isConnectingRef.current = false;
      setConnectionError("Failed to connect");
    }
  }, [endpoint, enabled]); // Only endpoint and enabled as dependencies

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    isConnectingRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      // Remove event listeners to prevent memory leaks
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      
      // Close the connection if it's open or connecting
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // Only depend on enabled, not connect/disconnect

  return {
    isConnected,
    lastMessage,
    connectionError,
    sendMessage,
    reconnect: connect,
    disconnect,
  };
}
