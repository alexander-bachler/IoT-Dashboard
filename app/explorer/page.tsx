'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExplorerControls } from '@/components/explorer/explorer-controls';
import { TimeSeriesChart } from '@/components/explorer/time-series-chart';
import { ExportMenu } from '@/components/explorer/export-menu';
import { DataQualityBadge } from '@/components/explorer/data-quality-badge';
import { useExplorerStore } from '@/lib/stores/explorer-store';
import { useTimeSeriesMeasurements, useMeasurementStatistics } from '@/lib/hooks/use-measurements';
import { ChartSkeleton, MetricCardSkeleton } from '@/components/ui/skeleton-loader';
import { NoDataState, ErrorState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

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
  const values = series.data.map((d) => d.value);
  const latest = values[values.length - 1];
  const previous = values[values.length - 2];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

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

  // Combine current and comparison data
  const series = useMemo(() => {
    let allSeries = currentData || [];

    if (compareMode && compareData) {
      const compareSeries = compareData.map((s) => ({
        ...s,
        metricName: `${s.metricName} (Previous)`,
        metricId: `${s.metricId}-compare`,
      }));
      allSeries = [...allSeries, ...compareSeries];
    }

    return allSeries;
  }, [currentData, compareData, compareMode]);

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
              <CardTitle>Visualization</CardTitle>
              <CardDescription>
                Showing {selectedMetricIds.length} metric{selectedMetricIds.length > 1 ? 's' : ''}
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
          <TimeSeriesChart series={series} chartType={chartType} isLoading={isLoading} />
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
