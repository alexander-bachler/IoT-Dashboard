'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useExplorerStore, ChartType, TimeRangePreset } from '@/lib/stores/explorer-store';
import { RefreshCw, BarChart3 } from 'lucide-react';
import { CustomTimeRangeDialog } from './custom-time-range-dialog';

interface Device {
  id: string;
  name: string;
  location?: string;
}

interface Metric {
  id: string;
  name: string;
  unit?: string;
}

interface ExplorerControlsProps {
  onRefresh: () => void;
  isLoading?: boolean;
}

export function ExplorerControls({ onRefresh, isLoading }: ExplorerControlsProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [availableMetrics, setAvailableMetrics] = useState<Metric[]>([]);

  const {
    selectedDeviceId,
    setSelectedDeviceId,
    selectedMetricIds,
    setSelectedMetricIds,
    timeRangePreset,
    setTimeRangePreset,
    customTimeRange,
    setCustomTimeRange,
    chartType,
    setChartType,
    autoAggregate,
    setAutoAggregate,
    aggregationInterval,
    setAggregationInterval,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
  } = useExplorerStore();

  // Load devices on mount
  useEffect(() => {
    fetch('/api/devices')
      .then((res) => res.json())
      .then((data) => setDevices(data.devices || []))
      .catch(console.error);
  }, []);

  // Load metrics when device changes
  useEffect(() => {
    if (!selectedDeviceId) {
      setAvailableMetrics([]);
      return;
    }

    fetch(`/api/devices/${selectedDeviceId}/metrics`)
      .then((res) => res.json())
      .then((data) => setAvailableMetrics(data.metrics || []))
      .catch(console.error);
  }, [selectedDeviceId]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setSelectedMetricIds([]); // Reset metrics when device changes
  };

  const handleMetricToggle = (metricId: string) => {
    if (selectedMetricIds.includes(metricId)) {
      setSelectedMetricIds(selectedMetricIds.filter((id) => id !== metricId));
    } else {
      setSelectedMetricIds([...selectedMetricIds, metricId]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Explorer Controls
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading || selectedMetricIds.length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Device Selection */}
        <div className="space-y-2">
          <Label>Device</Label>
          <Select value={selectedDeviceId || ''} onValueChange={handleDeviceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a device" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name} {device.location && `(${device.location})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Metrics Multi-Select */}
        <div className="space-y-2">
          <Label>Metrics</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
            {availableMetrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {selectedDeviceId ? 'No metrics available' : 'Select a device first'}
              </p>
            ) : (
              availableMetrics.map((metric) => (
                <label
                  key={metric.id}
                  className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMetricIds.includes(metric.id)}
                    onChange={() => handleMetricToggle(metric.id)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {metric.name} {metric.unit && `(${metric.unit})`}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Time Range */}
        <div className="space-y-2">
          <Label>Time Range</Label>
          <Select
            value={timeRangePreset}
            onValueChange={(value) => setTimeRangePreset(value as TimeRangePreset)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_hour">Last Hour</SelectItem>
              <SelectItem value="last_24h">Last 24 Hours</SelectItem>
              <SelectItem value="last_7d">Last 7 Days</SelectItem>
              <SelectItem value="last_30d">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {timeRangePreset === 'custom' && (
            <div className="pt-2">
              <CustomTimeRangeDialog
                value={customTimeRange}
                onApply={setCustomTimeRange}
              />
              {customTimeRange && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {customTimeRange.start.toLocaleString()} → {customTimeRange.end.toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chart Type */}
        <div className="space-y-2">
          <Label>Chart Type</Label>
          <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="line">📈 Line</SelectItem>
              <SelectItem value="bar">📊 Bar</SelectItem>
              <SelectItem value="area">📉 Area</SelectItem>
              <SelectItem value="scatter">⚫ Scatter</SelectItem>
              <SelectItem value="heatmap">🔥 Heatmap</SelectItem>
              <SelectItem value="gauge">⏲️ Gauge</SelectItem>
              <SelectItem value="radar">🎯 Radar</SelectItem>
              <SelectItem value="pie">🥧 Pie</SelectItem>
              <SelectItem value="funnel">🔻 Funnel</SelectItem>
              <SelectItem value="treemap">🗂️ Treemap</SelectItem>
              <SelectItem value="boxplot">📦 Boxplot</SelectItem>
              <SelectItem value="sankey">🌊 Sankey</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Auto Aggregate */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoAggregate}
              onChange={(e) => setAutoAggregate(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Auto-Aggregate</span>
          </label>
          {autoAggregate && (
            <Select
              value={aggregationInterval}
              onValueChange={setAggregationInterval}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1 minute">1 Minute</SelectItem>
                <SelectItem value="5 minutes">5 Minutes</SelectItem>
                <SelectItem value="15 minutes">15 Minutes</SelectItem>
                <SelectItem value="1 hour">1 Hour</SelectItem>
                <SelectItem value="6 hours">6 Hours</SelectItem>
                <SelectItem value="1 day">1 Day</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Auto Refresh */}
        <div className="space-y-2 pt-2 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Auto-Refresh</span>
          </label>
          {autoRefresh && (
            <Select
              value={refreshInterval.toString()}
              onValueChange={(value) => setRefreshInterval(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Every 10 seconds</SelectItem>
                <SelectItem value="30">Every 30 seconds</SelectItem>
                <SelectItem value="60">Every 1 minute</SelectItem>
                <SelectItem value="300">Every 5 minutes</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
