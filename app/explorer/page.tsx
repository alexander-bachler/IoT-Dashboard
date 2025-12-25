'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExplorerControls } from '@/components/explorer/explorer-controls';
import { TimeSeriesChart } from '@/components/explorer/time-series-chart';
import { ExportMenu } from '@/components/explorer/export-menu';
import { DataQualityBadge } from '@/components/explorer/data-quality-badge';
import { useExplorerStore } from '@/lib/stores/explorer-store';
import { useTimeSeriesMeasurements, useMeasurementStatistics } from '@/lib/hooks/use-measurements';
import { useLiveMeasurements } from '@/lib/hooks/use-websocket';
import { ChartSkeleton, MetricCardSkeleton } from '@/components/ui/skeleton-loader';
import { NoDataState, ErrorState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Radio } from 'lucide-react';

interface Series {
  metricId: string;
  metricName: string;
  metricUnit?: string;
  data: Array<{
    time: string;
    value: number;
    quality?: number;
  }>;
}

function MetricStatsCard({ series }: { series: Series }) {
  const data = series?.data ?? [];
  if (data.length === 0) return null;
  
  const values = data.map((d) => d.value);
  const latest = values[values.length - 1] ?? 0;
  const previous = values[values.length - 2];
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;

  const trend = previous ? ((latest - previous) / previous) * 100 : 0;
  const isPositive = trend >= 0;

  return (
    <Card className="metric-card hover-scale">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground truncate">
            {series.metricName}
          </CardTitle>
          {trend !== 0 && (
            <Badge variant="outline" className={isPositive ? 'text-green-500' : 'text-red-500'}>
              {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {Math.abs(trend).toFixed(1)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Latest:</span>
          <span className="font-semibold font-mono text-lg gradient-text">
            {latest.toFixed(2)} {series.metricUnit}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Average:</span>
          <span className="font-medium font-mono">
            {avg.toFixed(2)} {series.metricUnit}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Range:</span>
          <span className="font-medium font-mono text-sm">
            {min.toFixed(2)} - {max.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Data Points:</span>
          <span className="font-medium">{values.length}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ExplorerContent() {
  const {
    selectedMetricIds,
    getTimeRange,
    chartType,
    autoAggregate,
    aggregationInterval,
    compareMode,
    compareOffset,
  } = useExplorerStore();

  const timeRange = getTimeRange();
  const [liveData, setLiveData] = useState<Map<string, Array<{ time: string; value: number; quality?: number }>>>(new Map());
  const [isReceivingLive, setIsReceivingLive] = useState(false);

  // Fetch current time-series data
  const {
    data: currentData,
    isLoading,
    error,
    refetch,
  } = useTimeSeriesMeasurements({
    metric_ids: selectedMetricIds,
    start_time: timeRange.start.toISOString(),
    end_time: timeRange.end.toISOString(),
    interval: autoAggregate ? aggregationInterval : undefined,
    aggregation: autoAggregate ? 'avg' : undefined,
  });

  // Subscribe to live measurements
  useLiveMeasurements(
    selectedMetricIds,
    (measurement) => {
      setIsReceivingLive(true);

      // Append new measurement to live data
      setLiveData((prev) => {
        const newMap = new Map(prev);
        const metricData = newMap.get(measurement.metric_id) || [];

        // Add new measurement and keep only last 100 points to avoid memory issues
        const updatedData = [
          ...metricData,
          {
            time: measurement.timestamp,
            value: measurement.value,
            quality: measurement.quality,
          },
        ].slice(-100);

        newMap.set(measurement.metric_id, updatedData);
        return newMap;
      });

      // Reset the live indicator after 2 seconds
      setTimeout(() => setIsReceivingLive(false), 2000);
    },
    {
      enabled: selectedMetricIds.length > 0 && !compareMode,
    }
  );

  // Fetch comparison data if compare mode is enabled
  const compareStart = useMemo(() => {
    if (!compareMode) return null;
    const start = new Date(timeRange.start);
    start.setHours(start.getHours() + compareOffset);
    return start;
  }, [compareMode, timeRange.start, compareOffset]);

  const compareEnd = useMemo(() => {
    if (!compareMode) return null;
    const end = new Date(timeRange.end);
    end.setHours(end.getHours() + compareOffset);
    return end;
  }, [compareMode, timeRange.end, compareOffset]);

  const { data: compareData } = useTimeSeriesMeasurements({
    metric_ids: selectedMetricIds,
    start_time: compareStart?.toISOString() || '',
    end_time: compareEnd?.toISOString() || '',
    interval: autoAggregate ? aggregationInterval : undefined,
    aggregation: autoAggregate ? 'avg' : undefined,
  }, {
    enabled: compareMode && selectedMetricIds.length > 0,
  });

  // Combine current, comparison, and live data
  const series = useMemo(() => {
    let allSeries = (currentData || []).map((s) => {
      // Merge historical data with live data for this metric
      const live = liveData.get(s.metric_id) || [];
      return {
        metricId: s.metric_id,
        metricName: s.metric_name,
        metricUnit: s.metric_unit,
        data: [...s.data, ...live],
      };
    });

    if (compareMode && compareData) {
      const compareSeries = compareData.map((s) => ({
        metricId: `${s.metric_id}-compare`,
        metricName: `${s.metric_name} (Previous)`,
        metricUnit: s.metric_unit,
        data: s.data,
      }));
      allSeries = [...allSeries, ...compareSeries];
    }

    return allSeries;
  }, [currentData, compareData, compareMode, liveData]);

  if (selectedMetricIds.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12">
          <NoDataState
            title="No Metrics Selected"
            description="Select one or more metrics from the sidebar to start visualizing your IoT data"
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <div className="grid md:grid-cols-3 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load time-series data"
        description={error.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Visualization</CardTitle>
                {!compareMode && selectedMetricIds.length > 0 && (
                  <Badge
                    variant="outline"
                    className={`gap-1.5 ${
                      isReceivingLive
                        ? 'bg-green-500/20 border-green-500/30 text-green-500'
                        : 'bg-blue-500/20 border-blue-500/30 text-blue-500'
                    }`}
                  >
                    <Radio className={`h-3 w-3 ${isReceivingLive ? 'animate-pulse' : ''}`} />
                    LIVE
                  </Badge>
                )}
              </div>
              <CardDescription>
                Showing {selectedMetricIds.length} metric{selectedMetricIds.length > 1 ? 's' : ''}
                {!compareMode && liveData.size > 0 && (
                  <span className="text-green-500 ml-2">
                    + {Array.from(liveData.values()).reduce((acc, data) => acc + data.length, 0)} live points
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {series.length > 0 && series[0] && series[0].data.length > 0 && (
                <DataQualityBadge data={series[0].data} />
              )}
              <ExportMenu series={series} disabled={isLoading} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TimeSeriesChart
            series={series}
            chartType={chartType === 'line' || chartType === 'bar' || chartType === 'area' || chartType === 'scatter' ? chartType : 'line'}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {series.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {series.slice(0, 6).map((s) => (
            <MetricStatsCard key={s.metricId} series={s} />
          ))}
        </div>
      )}
    </>
  );
}

export default function ExplorerPage() {
  const { selectedMetricIds } = useExplorerStore();

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        {/* Gradient orbs */}
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" />

        {/* Header */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <h1 className="section-header mb-0">Data Explorer</h1>
          </div>
          <p className="text-muted-foreground">
            Analyze and visualize your IoT time-series data in real-time
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar Controls */}
          <div className="lg:col-span-1">
            <ExplorerControls />
          </div>

          {/* Main Chart Area */}
          <div className="lg:col-span-3">
            <ExplorerContent />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
