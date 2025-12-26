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
import { Checkbox } from '@/components/ui/checkbox';
import { useDashboardStore, WidgetConfig, ChartType } from '@/lib/stores/dashboard-store';
import { toast } from 'sonner';

interface Device {
  id: string;
  name: string;
}

interface Metric {
  id: string;
  name: string;
  unit?: string;
}

interface ConfigureWidgetDialogProps {
  widget: WidgetConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigureWidgetDialog({ widget, open, onOpenChange }: ConfigureWidgetDialogProps) {
  const [title, setTitle] = useState('');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedMetricIds, setSelectedMetricIds] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState('last_24h');
  const [aggregationInterval, setAggregationInterval] = useState('');
  const [refreshInterval, setRefreshInterval] = useState('60');

  const [devices, setDevices] = useState<Device[]>([]);
  const [availableMetrics, setAvailableMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);

  const { updateWidget } = useDashboardStore();

  // Initialize form with widget data
  useEffect(() => {
    if (widget && open) {
      setTitle(widget.title);
      setChartType(widget.chartType);
      setSelectedDeviceId(widget.deviceId);
      setSelectedMetricIds(widget.metricIds);
      setTimeRange(widget.timeRange?.value || 'last_24h');
      setAggregationInterval(widget.aggregationInterval || '');
      setRefreshInterval(String(widget.refreshInterval || 60));
    }
  }, [widget, open]);

  // Load devices on mount
  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch('/api/v1/devices')
        .then((res) => res.json())
        .then((data) => {
          setDevices(data || []);
        })
        .catch((error) => {
          console.error('Failed to load devices:', error);
          toast.error('Failed to load devices');
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  // Load metrics when device changes
  useEffect(() => {
    if (!selectedDeviceId) {
      setAvailableMetrics([]);
      return;
    }

    fetch(`/api/v1/devices/${selectedDeviceId}/metrics`)
      .then((res) => res.json())
      .then((data) => {
        setAvailableMetrics(data || []);
      })
      .catch((error) => {
        console.error('Failed to load metrics:', error);
        toast.error('Failed to load metrics');
      });
  }, [selectedDeviceId]);

  const handleMetricToggle = (metricId: string) => {
    if (selectedMetricIds.includes(metricId)) {
      setSelectedMetricIds(selectedMetricIds.filter((id) => id !== metricId));
    } else {
      setSelectedMetricIds([...selectedMetricIds, metricId]);
    }
  };

  const handleSubmit = () => {
    if (!widget || !title || selectedMetricIds.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    updateWidget(widget.id, {
      title,
      chartType,
      deviceId: selectedDeviceId,
      metricIds: selectedMetricIds,
      timeRange: {
        type: 'relative',
        value: timeRange,
      },
      aggregationInterval: aggregationInterval || undefined,
      refreshInterval: parseInt(refreshInterval) || 60,
    });

    toast.success('Widget updated successfully');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Widget</DialogTitle>
          <DialogDescription>
            Update widget settings and data sources
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Widget Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Temperature Over Time"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chartType">Chart Type</Label>
            <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="scatter">Scatter Plot</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="gauge">Gauge</SelectItem>
                <SelectItem value="heatmap">Heatmap</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="device">Device</Label>
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading..." : "Select a device"} />
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
            <Label>Metrics *</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {availableMetrics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {selectedDeviceId ? 'No metrics available' : 'Select a device first'}
                </p>
              ) : (
                availableMetrics.map((metric) => (
                  <div key={metric.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`metric-${metric.id}`}
                      checked={selectedMetricIds.includes(metric.id)}
                      onCheckedChange={() => handleMetricToggle(metric.id)}
                    />
                    <label
                      htmlFor={`metric-${metric.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {metric.name} {metric.unit && `(${metric.unit})`}
                    </label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {selectedMetricIds.length} metric(s)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeRange">Time Range</Label>
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

            <div className="space-y-2">
              <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
              <Input
                id="refreshInterval"
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                placeholder="60"
                min="10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aggregation">Aggregation (optional)</Label>
            <Input
              id="aggregation"
              value={aggregationInterval}
              onChange={(e) => setAggregationInterval(e.target.value)}
              placeholder="e.g., 15m, 1h, 1d"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for raw data
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title || selectedMetricIds.length === 0}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
