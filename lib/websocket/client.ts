import { toast } from 'sonner';

export type WebSocketMessage = {
  type: 'measurement' | 'anomaly' | 'status' | 'ping' | 'pong';
  data?: any;
  timestamp?: string;
};

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private handlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private statusCallbacks: Set<(status: ConnectionStatus) => void> = new Set();
  private currentStatus: ConnectionStatus = 'disconnected';

  constructor() {
    // Use environment variable or default to localhost WebSocket endpoint
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.NEXT_PUBLIC_WS_URL || `${wsProtocol}//${window.location.host}/ws`;
    this.url = wsHost;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    this.setStatus('connecting');
    console.log(`[WebSocket] Connecting to ${this.url}...`);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.setStatus('connected');
        this.startHeartbeat();
        toast.success('Real-time connection established');
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.setStatus('error');
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        this.setStatus('disconnected');
        this.stopHeartbeat();

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          toast.error('Real-time connection lost. Please refresh the page.');
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    console.log('[WebSocket] Disconnecting...');
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Subscribe to specific message types
   */
  subscribe(type: string, handler: WebSocketEventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void) {
    this.statusCallbacks.add(callback);

    // Call immediately with current status
    callback(this.currentStatus);

    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Send message to server
   */
  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, not connected');
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.currentStatus === 'connected';
  }

  // Private methods

  private handleMessage(message: WebSocketMessage) {
    // Handle pong response
    if (message.type === 'pong') {
      return;
    }

    // Notify subscribers
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('[WebSocket] Handler error:', error);
        }
      });
    }

    // Also notify wildcard subscribers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('[WebSocket] Wildcard handler error:', error);
        }
      });
    }
  }

  private setStatus(status: ConnectionStatus) {
    this.currentStatus = status;
    this.statusCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error('[WebSocket] Status callback error:', error);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (typeof window === 'undefined') {
    // Server-side rendering - return a mock
    return {
      connect: () => {},
      disconnect: () => {},
      subscribe: () => () => {},
      onStatusChange: () => () => {},
      send: () => {},
      getStatus: () => 'disconnected' as ConnectionStatus,
      isConnected: () => false,
    } as any;
  }

  if (!wsClient) {
    wsClient = new WebSocketClient();
  }

  return wsClient;
}

export default WebSocketClient;
