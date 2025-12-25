'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Database, Activity, Clock, Zap, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebSocketStatus } from '@/lib/hooks/use-websocket';

export function StatusBar() {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [dbStatus, setDbStatus] = useState<'healthy' | 'degraded' | 'offline'>('healthy');

  // WebSocket connection status
  const wsStatus = useWebSocketStatus();

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update timestamp every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getWsStatusColor = () => {
    switch (wsStatus) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getWsStatusText = () => {
    switch (wsStatus) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting';
      case 'error':
        return 'Error';
      default:
        return 'Offline';
    }
  };

  return (
    <footer className="sticky bottom-0 z-40 w-full border-t border-border/40 glass-card h-8">
      <div className="container flex h-full items-center justify-between px-4 text-xs">
        {/* Left side - Connection Status */}
        <div className="flex items-center gap-6">
          {/* Network Status */}
          <div className="flex items-center gap-2">
            {connectionStatus === 'online' ? (
              <>
                <div className="relative">
                  <Wifi className="h-3.5 w-3.5 text-green-500" />
                  <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-subtle" />
                </div>
                <span className="text-muted-foreground">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-red-500" />
                <span className="text-red-500">Offline</span>
              </>
            )}
          </div>

          {/* WebSocket Status - Real-time Connection */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radio
                className={cn('h-3.5 w-3.5', getWsStatusColor())}
              />
              {wsStatus === 'connected' && (
                <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-subtle" />
              )}
            </div>
            <span className="text-muted-foreground">
              WS: <span className={getWsStatusColor()}>{getWsStatusText()}</span>
            </span>
          </div>

          {/* Database Status */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Database
                className={cn(
                  'h-3.5 w-3.5',
                  dbStatus === 'healthy' && 'text-green-500',
                  dbStatus === 'degraded' && 'text-yellow-500',
                  dbStatus === 'offline' && 'text-red-500'
                )}
              />
              {dbStatus === 'healthy' && (
                <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-subtle" />
              )}
            </div>
            <span className="text-muted-foreground">
              DB: <span className="capitalize">{dbStatus}</span>
            </span>
          </div>

          {/* API Status */}
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-muted-foreground">API: Ready</span>
          </div>
        </div>

        {/* Center - Quick Stats */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
            <Zap className="h-3 w-3 text-blue-500" />
            <span className="text-muted-foreground font-mono">10M+ records</span>
          </div>
          <div className="text-muted-foreground font-mono">v2.4.0</div>
        </div>

        {/* Right side - Timestamp */}
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground font-mono">
            {formatDate(lastUpdated)} {formatTime(lastUpdated)}
          </span>
        </div>
      </div>
    </footer>
  );
}
