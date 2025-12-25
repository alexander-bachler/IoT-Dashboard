'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Loader2, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FileImportDialogProps {
  datasourceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function FileImportDialog({
  datasourceId,
  open,
  onOpenChange,
  onSuccess,
}: FileImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    timeColumn: '',
    valueColumn: '',
    deviceColumn: '',
    metricName: 'value',
    deviceName: '',
  });

  // Load file columns when dialog opens
  useEffect(() => {
    if (open && datasourceId) {
      loadFileColumns();
    }
  }, [open, datasourceId]);

  const loadFileColumns = async () => {
    setLoadingColumns(true);
    try {
      // Fetch actual column names from uploaded file
      const response = await fetch(`/api/v1/data-sources/${datasourceId}/file-columns`);
      if (!response.ok) {
        throw new Error('Failed to load file columns');
      }

      const data = await response.json();
      setColumns(data.columns || []);

      if (data.columns && data.columns.length > 0) {
        toast.success(`Loaded ${data.column_count} columns from file`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load file columns');
      // Fallback to placeholder columns
      setColumns(['timestamp', 'time', 'datetime', 'value', 'sensor_id', 'device_id']);
    } finally {
      setLoadingColumns(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.timeColumn || !formData.valueColumn) {
      toast.error('Please select time and value columns');
      return;
    }

    if (!formData.deviceColumn && !formData.deviceName) {
      toast.error('Please either select a device column or enter a device name');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/v1/data-sources/${datasourceId}/import-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_column: formData.timeColumn,
          value_column: formData.valueColumn,
          device_column: formData.deviceColumn || null,
          metric_name: formData.metricName,
          device_name: formData.deviceName || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to import file');
      }

      const result = await response.json();

      toast.success(
        `Successfully imported ${result.measurements_imported} measurements! Created ${result.devices_created} devices and ${result.metrics_created} metrics.`
      );

      // Reset form
      setFormData({
        timeColumn: '',
        valueColumn: '',
        deviceColumn: '',
        metricName: 'value',
        deviceName: '',
      });

      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Import File to Database</DialogTitle>
          <DialogDescription>
            Configure how to import this file into devices, metrics, and measurements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {loadingColumns ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading file structure...
                </span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="time-column">Time Column *</Label>
                  <Select
                    value={formData.timeColumn}
                    onValueChange={(value) =>
                      setFormData({ ...formData, timeColumn: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timestamp column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Column containing timestamps
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value-column">Value Column *</Label>
                  <Select
                    value={formData.valueColumn}
                    onValueChange={(value) =>
                      setFormData({ ...formData, valueColumn: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select value column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Column containing measurement values
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-column">Device Column (Optional)</Label>
                  <Select
                    value={formData.deviceColumn}
                    onValueChange={(value) =>
                      setFormData({ ...formData, deviceColumn: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device identifier column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Column containing device names/IDs (leave empty for single device)
                  </p>
                </div>

                {!formData.deviceColumn && (
                  <div className="space-y-2">
                    <Label htmlFor="device-name">Device Name *</Label>
                    <Input
                      id="device-name"
                      value={formData.deviceName}
                      onChange={(e) =>
                        setFormData({ ...formData, deviceName: e.target.value })
                      }
                      placeholder="e.g., Sensor #1"
                    />
                    <p className="text-xs text-muted-foreground">
                      Name for the device (required if no device column selected)
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="metric-name">Metric Name</Label>
                  <Input
                    id="metric-name"
                    value={formData.metricName}
                    onChange={(e) =>
                      setFormData({ ...formData, metricName: e.target.value })
                    }
                    placeholder="e.g., temperature"
                  />
                  <p className="text-xs text-muted-foreground">
                    Name for the metric (default: "value")
                  </p>
                </div>
              </>
            )}

            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <strong>Note:</strong> Large files may take several minutes to import.
                Data will be stored in the measurements table and will be available
                for visualization in dashboards.
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
            <Button type="submit" disabled={loading || loadingColumns}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import to Database
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
