'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Settings } from 'lucide-react';
import { TimeSeriesChart } from '@/components/explorer/time-series-chart';
import { useState, useEffect } from 'react';
import type { WidgetConfig } from '@/lib/stores/dashboard-store';

interface DashboardWidgetProps {
  widget: WidgetConfig;
  isEditMode: boolean;
  onRemove: () => void;
  onConfigure: () => void;
}

interface Series {
  metricId: string;
  metricName: string;
  metricUnit?: string;
  data: Array<{
    time: string;
    value: number;
  }>;
}

export function DashboardWidget({
  widget,
  isEditMode,
  onRemove,
  onConfigure,
}: DashboardWidgetProps) {
  const [series, setSeries] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        // Calculate time range based on widget config
        const end = new Date();
        const start = new Date();

        if (widget.timeRange.type === 'relative') {
          switch (widget.timeRange.value) {
            case 'last_hour':
              start.setHours(start.getHours() - 1);
              break;
            case 'last_24h':
              start.setDate(start.getDate() - 1);
              break;
            case 'last_7d':
              start.setDate(start.getDate() - 7);
              break;
            default:
              start.setDate(start.getDate() - 1);
          }
        }

        const response = await fetch('/api/measurements/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metricIds: widget.metricIds,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            aggregation: widget.aggregationInterval,
          }),
        });

        const data = await response.json();
        setSeries(data.series || []);
      } catch (error) {
        console.error('Error fetching widget data:', error);
        setSeries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up auto-refresh if configured
    if (widget.refreshInterval && widget.refreshInterval > 0) {
      const interval = setInterval(fetchData, widget.refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [widget]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{widget.title}</CardTitle>
          {isEditMode && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onConfigure}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-2 overflow-hidden">
        <div className="h-full">
          <TimeSeriesChart
            series={series}
            chartType={
              ['line', 'bar', 'area', 'scatter'].includes(widget.chartType)
                ? (widget.chartType as 'line' | 'bar' | 'area' | 'scatter')
                : 'line'
            }
            isLoading={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
