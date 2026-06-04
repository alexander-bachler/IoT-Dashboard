'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardStore, WidgetConfig } from '@/lib/stores/dashboard-store';
import apiClient from '@/lib/api/client';

interface Device {
  id: string;
  name: string;
}

interface Metric {
  id: string;
  name: string;
  unit?: string;
}

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWidgetDialog({ open, onOpenChange }: AddWidgetDialogProps) {
  const [title, setTitle] = useState('');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'scatter'>('line');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedMetricIds, setSelectedMetricIds] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState('last_24h');
  const [aggregationInterval, setAggregationInterval] = useState('15 minutes');
  const [refreshInterval, setRefreshInterval] = useState('60');

  const [devices, setDevices] = useState<Device[]>([]);
  const [availableMetrics, setAvailableMetrics] = useState<Metric[]>([]);

  const { addWidget } = useDashboardStore();

  // Load devices on mount
  useEffect(() => {
    if (open) {
      apiClient
        .get<Device[]>('/api/v1/devices')
        .then((res) => setDevices(res.data || []))
        .catch(console.error);
    }
  }, [open]);

  // Load metrics when device changes
  useEffect(() => {
    if (!selectedDeviceId) {
      setAvailableMetrics([]);
      return;
    }

    apiClient
      .get<Metric[]>(`/api/v1/devices/${selectedDeviceId}/metrics`)
      .then((res) => setAvailableMetrics(res.data || []))
      .catch(console.error);
  }, [selectedDeviceId]);

  const handleMetricToggle = (metricId: string) => {
    if (selectedMetricIds.includes(metricId)) {
      setSelectedMetricIds(selectedMetricIds.filter((id) => id !== metricId));
    } else {
      setSelectedMetricIds([...selectedMetricIds, metricId]);
    }
  };

  const handleSubmit = () => {
    if (!title || !selectedDeviceId || selectedMetricIds.length === 0) {
      return;
    }

    const widget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      title,
      chartType,
      deviceId: selectedDeviceId,
      metricIds: selectedMetricIds,
      timeRange: {
        type: 'relative',
        value: timeRange,
      },
      aggregationInterval,
      refreshInterval: parseInt(refreshInterval),
    };

    addWidget(widget);
    onOpenChange(false);

    // Reset form
    setTitle('');
    setSelectedDeviceId('');
    setSelectedMetricIds([]);
    setTimeRange('last_24h');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Configure a new widget for your dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Widget Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Temperature Over Time"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="device">Device</Label>
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chart-type">Chart Type</Label>
              <Select
                value={chartType}
                onValueChange={(value: any) => setChartType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="scatter">Scatter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-range">Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_hour">Last Hour</SelectItem>
                  <SelectItem value="last_24h">Last 24 Hours</SelectItem>
                  <SelectItem value="last_7d">Last 7 Days</SelectItem>
                  <SelectItem value="last_30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aggregation">Aggregation</Label>
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
                  <SelectItem value="1 day">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refresh">Refresh Interval (seconds)</Label>
              <Input
                id="refresh"
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                min="0"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title || !selectedDeviceId || selectedMetricIds.length === 0}
          >
            Add Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
