'use client';

import { useEffect } from 'react';
import { useWebSocketConnection, useLiveAnomalies } from '@/lib/hooks/use-websocket';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  // Auto-connect to WebSocket
  const { status, isConnected } = useWebSocketConnection();

  // Listen for live anomalies and show toast notifications
  useLiveAnomalies((anomaly) => {
    const severityConfig = {
      critical: { icon: '🚨', variant: 'destructive' as const },
      high: { icon: '⚠️', variant: 'default' as const },
      medium: { icon: '⚡', variant: 'default' as const },
      low: { icon: 'ℹ️', variant: 'default' as const },
    };

    const config = severityConfig[anomaly.severity] || severityConfig.low;

    toast.error(`${config.icon} Anomaly Detected`, {
      description: anomaly.description || `Value: ${anomaly.value.toFixed(2)}`,
      action: {
        label: 'View',
        onClick: () => {
          window.location.href = '/anomalies';
        },
      },
      duration: anomaly.severity === 'critical' ? 0 : 5000, // Critical stays until dismissed
    });
  });

  // Log connection status changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[WebSocket Provider] Status:', status);
    }
  }, [status]);

  return <>{children}</>;
}
