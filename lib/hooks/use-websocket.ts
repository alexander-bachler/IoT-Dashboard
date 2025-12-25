import { useEffect, useState, useCallback, useRef } from 'react';
import { getWebSocketClient, WebSocketMessage, ConnectionStatus } from '../websocket/client';

/**
 * Hook to get WebSocket connection status
 */
export function useWebSocketStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const ws = getWebSocketClient();

  useEffect(() => {
    const unsubscribe = ws.onStatusChange(setStatus);
    return unsubscribe;
  }, [ws]);

  return status;
}

/**
 * Hook to connect/disconnect WebSocket automatically
 */
export function useWebSocketConnection() {
  const ws = getWebSocketClient();
  const status = useWebSocketStatus();

  useEffect(() => {
    // Auto-connect on mount
    ws.connect();

    // Disconnect on unmount
    return () => {
      // Don't disconnect - keep connection alive for other components
      // ws.disconnect();
    };
  }, [ws]);

  const reconnect = useCallback(() => {
    ws.disconnect();
    setTimeout(() => ws.connect(), 100);
  }, [ws]);

  return {
    status,
    isConnected: status === 'connected',
    reconnect,
  };
}

/**
 * Hook to subscribe to WebSocket messages of a specific type
 */
export function useWebSocketSubscription<T = any>(
  messageType: string,
  handler: (data: T) => void,
  options: {
    enabled?: boolean;
  } = {}
) {
  const { enabled = true } = options;
  const ws = getWebSocketClient();
  const handlerRef = useRef(handler);

  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = ws.subscribe(messageType, (message: WebSocketMessage) => {
      if (handlerRef.current) {
        handlerRef.current(message.data);
      }
    });

    return unsubscribe;
  }, [ws, messageType, enabled]);
}

/**
 * Hook to send WebSocket messages
 */
export function useWebSocketSend() {
  const ws = getWebSocketClient();

  const send = useCallback(
    (type: string, data?: any) => {
      ws.send({
        type: type as any,
        data,
        timestamp: new Date().toISOString(),
      });
    },
    [ws]
  );

  return send;
}

/**
 * Hook for live measurement updates
 */
export function useLiveMeasurements(
  metricIds: string[],
  onMeasurement: (measurement: {
    metric_id: string;
    value: number;
    timestamp: string;
    quality?: number;
  }) => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  useWebSocketSubscription(
    'measurement',
    (data) => {
      // Filter by metric IDs if specified
      if (metricIds.length === 0 || metricIds.includes(data.metric_id)) {
        onMeasurement(data);
      }
    },
    { enabled }
  );
}

/**
 * Hook for live anomaly alerts
 */
export function useLiveAnomalies(
  onAnomaly: (anomaly: {
    id: string;
    metric_id: string;
    timestamp: string;
    value: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description?: string;
  }) => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  useWebSocketSubscription('anomaly', onAnomaly, { enabled });
}

/**
 * Hook for live system status updates
 */
export function useLiveStatus(
  onStatus: (status: {
    component: string;
    status: 'healthy' | 'degraded' | 'offline';
    message?: string;
  }) => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  useWebSocketSubscription('status', onStatus, { enabled });
}
