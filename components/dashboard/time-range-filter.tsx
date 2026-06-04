'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardStore } from '@/lib/stores/dashboard-store';
import { Clock } from 'lucide-react';

// Sentinel value: shadcn Select items can't be empty, so map "off" to a token.
const PER_WIDGET = 'per_widget';

export function TimeRangeFilter() {
  const { globalTimeRange, setGlobalTimeRange } = useDashboardStore();

  return (
    <Select
      value={globalTimeRange ?? PER_WIDGET}
      onValueChange={(v) => setGlobalTimeRange(v === PER_WIDGET ? null : v)}
    >
      <SelectTrigger className="w-[180px] gap-2">
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={PER_WIDGET}>Per widget</SelectItem>
        <SelectItem value="last_hour">Last hour</SelectItem>
        <SelectItem value="last_24h">Last 24 hours</SelectItem>
        <SelectItem value="last_7d">Last 7 days</SelectItem>
        <SelectItem value="last_30d">Last 30 days</SelectItem>
      </SelectContent>
    </Select>
  );
}
