'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import apiClient from '@/lib/api/client';

interface LineMetricsImportDialogProps {
  datasourceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface DeviceStream {
  id: string;
  name: string;
  unit?: string;
  deviceName: string;
}

export function LineMetricsImportDialog({
  datasourceId,
  open,
  onOpenChange,
  onSuccess,
}: LineMetricsImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [streams, setStreams] = useState<DeviceStream[]>([]);
  const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    fromDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    toDate: format(new Date(), 'yyyy-MM-dd'),
    aggregation: 'avg',
    granularity: 'PT15M',
  });

  // Load devices when dialog opens
  useEffect(() => {
    if (open && datasourceId) {
      loadDevicesAndStreams();
    }
  }, [open, datasourceId]);

  const loadDevicesAndStreams = async () => {
    setLoadingStreams(true);
    try {
      // Fetch devices
      const devicesResponse = await apiClient.get(`/api/v1/linemetrics/${datasourceId}/devices`);
      const devicesData = devicesResponse.data;
      setDevices(devicesData);

      // Fetch streams for each device
      const allStreams: DeviceStream[] = [];
      for (const device of devicesData) {
        try {
          const streamsResponse = await apiClient.get(
            `/api/v1/linemetrics/${datasourceId}/devices/${device.id}/streams`
          );
          const deviceStreams = streamsResponse.data;
          deviceStreams.forEach((stream: any) => {
            allStreams.push({
              id: stream.id,
              name: stream.name,
              unit: stream.unit,
              deviceName: device.name,
            });
          });
        } catch (error) {
          console.error(`Failed to load streams for device ${device.id}:`, error);
        }
      }

      setStreams(allStreams);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load devices and streams');
    } finally {
      setLoadingStreams(false);
    }
  };

  const handleStreamToggle = (streamId: string) => {
    setSelectedStreams((prev) =>
      prev.includes(streamId)
        ? prev.filter((id) => id !== streamId)
        : [...prev, streamId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStreams.length === streams.length) {
      setSelectedStreams([]);
    } else {
      setSelectedStreams(streams.map((s) => s.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedStreams.length === 0) {
      toast.error('Please select at least one stream to import');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post(`/api/v1/linemetrics/${datasourceId}/import`, {
        stream_ids: selectedStreams,
        from_time: new Date(formData.fromDate).toISOString(),
        to_time: new Date(formData.toDate).toISOString(),
        aggregation: formData.aggregation,
        interval: formData.granularity,
      });

      const result = response.data;

      toast.success(
        `Successfully imported ${result.measurements_imported} measurements from ${selectedStreams.length} streams!`
      );

      // Reset form
      setSelectedStreams([]);
      setFormData({
        fromDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        toDate: format(new Date(), 'yyyy-MM-dd'),
        aggregation: 'avg',
        granularity: 'PT15M',
      });

      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import measurements');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import LineMetrics Measurements</DialogTitle>
          <DialogDescription>
            Select streams and time range to import historical measurement data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-date">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={formData.fromDate}
                  onChange={(e) =>
                    setFormData({ ...formData, fromDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={formData.toDate}
                  onChange={(e) =>
                    setFormData({ ...formData, toDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {/* Aggregation and Granularity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aggregation">Aggregation</Label>
                <Select
                  value={formData.aggregation}
                  onValueChange={(value) =>
                    setFormData({ ...formData, aggregation: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_value">Last Value</SelectItem>
                    <SelectItem value="avg">Average</SelectItem>
                    <SelectItem value="min">Minimum</SelectItem>
                    <SelectItem value="max">Maximum</SelectItem>
                    <SelectItem value="sum">Sum</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How to aggregate data points
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="granularity">Granularity</Label>
                <Select
                  value={formData.granularity}
                  onValueChange={(value) =>
                    setFormData({ ...formData, granularity: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PT1M">1 Minute</SelectItem>
                    <SelectItem value="PT5M">5 Minutes</SelectItem>
                    <SelectItem value="PT15M">15 Minutes</SelectItem>
                    <SelectItem value="PT1H">1 Hour</SelectItem>
                    <SelectItem value="PT6H">6 Hours</SelectItem>
                    <SelectItem value="PT24H">24 Hours</SelectItem>
                    <SelectItem value="PT168H">1 Week</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Time interval for data points
                </p>
              </div>
            </div>

            {/* Stream Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Streams</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={loadingStreams}
                >
                  {selectedStreams.length === streams.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {loadingStreams ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Loading streams...
                  </span>
                </div>
              ) : streams.length === 0 ? (
                <div className="flex items-start gap-2 p-4 bg-muted rounded-lg">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    No streams found. Make sure you have synced devices first.
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                  {streams.map((stream) => (
                    <div
                      key={stream.id}
                      className="flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleStreamToggle(stream.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStreams.includes(stream.id)}
                        onChange={() => handleStreamToggle(stream.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{stream.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {stream.deviceName}
                          {stream.unit && ` • ${stream.unit}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedStreams.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedStreams.length} stream{selectedStreams.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <strong>Note:</strong> Importing large time ranges may take several minutes.
                The import will run in the background and measurements will appear in your
                dashboard once complete.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedStreams.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import Measurements
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
