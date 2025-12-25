'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExplorerControls } from '@/components/explorer/explorer-controls';
import { TimeSeriesChart } from '@/components/explorer/time-series-chart';
import { ExportMenu } from '@/components/explorer/export-menu';
import { useExplorerStore } from '@/lib/stores/explorer-store';

interface Series {
  metricId: string;
  metricName: string;
  metricUnit?: string;
  data: Array<{
    time: string;
    value: number;
    min?: number;
    max?: number;
  }>;
}

export default function ExplorerPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    selectedMetricIds,
    getTimeRange,
    chartType,
    autoAggregate,
    aggregationInterval,
    autoRefresh,
    refreshInterval,
  } = useExplorerStore();

  const fetchData = useCallback(async () => {
    if (selectedMetricIds.length === 0) {
      setSeries([]);
      return;
    }

    setIsLoading(true);

    try {
      const timeRange = getTimeRange();

      const response = await fetch('/api/measurements/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metricIds: selectedMetricIds,
          startTime: timeRange.start.toISOString(),
          endTime: timeRange.end.toISOString(),
          aggregation: autoAggregate ? aggregationInterval : undefined,
        }),
      });

      const data = await response.json();
      setSeries(data.series || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setSeries([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMetricIds, getTimeRange, autoAggregate, aggregationInterval]);

  // Auto-fetch when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh || selectedMetricIds.length === 0) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchData();
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, selectedMetricIds.length, fetchData]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Data Explorer</h1>
          <p className="text-muted-foreground">
            Analyze and visualize your IoT time-series data
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar Controls */}
          <div className="lg:col-span-1">
            <ExplorerControls onRefresh={fetchData} isLoading={isLoading} />
          </div>

          {/* Main Chart Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Visualization</CardTitle>
                    <CardDescription>
                      {selectedMetricIds.length === 0
                        ? 'Select metrics to start visualizing data'
                        : `Showing ${selectedMetricIds.length} metric${selectedMetricIds.length > 1 ? 's' : ''}`}
                    </CardDescription>
                  </div>
                  <ExportMenu series={series} disabled={isLoading} />
                </div>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart
                  series={series}
                  chartType={chartType}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>

            {/* Stats Cards */}
            {series.length > 0 && (
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                {series.map((s) => {
                  const values = s.data.map((d) => d.value);
                  const latest = values[values.length - 1];
                  const avg = values.reduce((a, b) => a + b, 0) / values.length;
                  const min = Math.min(...values);
                  const max = Math.max(...values);

                  return (
                    <Card key={s.metricId}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {s.metricName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Latest:</span>
                            <span className="font-semibold">
                              {latest.toFixed(2)} {s.metricUnit}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Average:</span>
                            <span className="font-semibold">
                              {avg.toFixed(2)} {s.metricUnit}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Min / Max:</span>
                            <span className="font-semibold">
                              {min.toFixed(2)} / {max.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
