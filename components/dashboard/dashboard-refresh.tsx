'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardStore } from '@/lib/stores/dashboard-store';
import { RefreshCw } from 'lucide-react';

const OFF = '0';

export function DashboardRefresh() {
  const { globalRefreshInterval, setGlobalRefreshInterval, triggerRefresh } =
    useDashboardStore();

  // Drive the auto-refresh timer from the selected interval.
  useEffect(() => {
    if (!globalRefreshInterval || globalRefreshInterval <= 0) return;
    const id = setInterval(triggerRefresh, globalRefreshInterval * 1000);
    return () => clearInterval(id);
  }, [globalRefreshInterval, triggerRefresh]);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={triggerRefresh}
        aria-label="Refresh all widgets"
        title="Refresh all widgets"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      <Select
        value={String(globalRefreshInterval || 0)}
        onValueChange={(v) => setGlobalRefreshInterval(Number(v))}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={OFF}>Auto: Off</SelectItem>
          <SelectItem value="10">Every 10s</SelectItem>
          <SelectItem value="30">Every 30s</SelectItem>
          <SelectItem value="60">Every 1m</SelectItem>
          <SelectItem value="300">Every 5m</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
