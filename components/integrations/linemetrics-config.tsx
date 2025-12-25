'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useLineMetricsBackendTest,
  useLineMetricsBackendDevices,
  useLineMetricsSync,
  useLineMetricsImport,
  useLineMetricsDevices,
} from '@/lib/hooks/use-linemetrics';
import type { LineMetricsConfig, LMDataQueryParams } from '@/lib/integrations/linemetrics-client';
import { Loader2, Download, RefreshCw, CheckCircle2, Database, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function LineMetricsConfiguration() {
  const [config, setConfig] = useState<LineMetricsConfig>({
    apiUrl: process.env.NEXT_PUBLIC_LINEMETRICS_API_URL || 'https://rest-api.linemetrics.com',
    clientId: '',
    clientSecret: '',
  });

  const [isConnected, setIsConnected] = useState(false);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);

  const connectionTest = useLineMetricsBackendTest();
  const fetchDevices = useLineMetricsBackendDevices();
  const syncDevices = useLineMetricsSync();

  const handleTestConnection = async () => {
    try {
      const result = await connectionTest.mutateAsync(config);
      setIsConnected(result.success);
      setDeviceCount(result.device_count || null);
    } catch (error) {
      setIsConnected(false);
      setDeviceCount(null);
    }
  };

  const handleSync = async () => {
    await syncDevices.mutateAsync(config);
  };

  const handleFetchDevices = async () => {
    try {
      const devices = await fetchDevices.mutateAsync(config);
      toast.success(`Found ${devices.length} devices`);
    } catch (error) {
      // Error already handled by hook
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            LineMetrics Integration
          </CardTitle>
          <CardDescription>
            Connect to your LineMetrics account using OAuth2 client credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-url">API URL</Label>
            <Input
              id="api-url"
              value={config.apiUrl}
              onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
              placeholder="https://rest-api.linemetrics.com"
            />
            <p className="text-xs text-muted-foreground">
              LineMetrics REST API v2 endpoint
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-id">Client ID</Label>
            <Input
              id="client-id"
              value={config.clientId}
              onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
              placeholder="Enter your OAuth2 client ID"
            />
            <p className="text-xs text-muted-foreground">
              You can find this in your LineMetrics account settings
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-secret">Client Secret</Label>
            <Input
              id="client-secret"
              type="password"
              value={config.clientSecret}
              onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
              placeholder="Enter your OAuth2 client secret"
            />
            <p className="text-xs text-muted-foreground">
              Keep this secret secure - it provides full access to your account
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={handleTestConnection}
              disabled={connectionTest.isPending || !config.clientId || !config.clientSecret}
              variant={isConnected ? 'outline' : 'default'}
            >
              {connectionTest.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : isConnected ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  Connected
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            {isConnected && deviceCount !== null && (
              <span className="text-sm text-muted-foreground">
                {deviceCount} device{deviceCount !== 1 ? 's' : ''} found
              </span>
            )}
          </div>

          {isConnected && (
            <div className="flex items-center gap-3 pt-2 border-t">
              <Button
                onClick={handleSync}
                disabled={syncDevices.isPending}
                variant="outline"
                className="mt-4"
              >
                {syncDevices.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Devices to Database
                  </>
                )}
              </Button>

              <Button
                onClick={handleFetchDevices}
                disabled={fetchDevices.isPending}
                variant="outline"
                className="mt-4"
              >
                {fetchDevices.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    View Devices
                  </>
                )}
              </Button>

              <LineMetricsImportDialog config={config} />
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>About LineMetrics Integration</CardTitle>
            <CardDescription>Data models and API features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-2">Supported Data Models:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <strong>Object Model</strong>: Hierarchical structure with objects, attributes,
                    and properties
                  </li>
                  <li>
                    <strong>Device Model</strong>: Simple device-based structure with inputs
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-medium mb-2">Aggregation Options:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <strong>last_value</strong>: Most recent value
                  </li>
                  <li>
                    <strong>avg</strong>: Average over interval
                  </li>
                  <li>
                    <strong>min / max</strong>: Minimum / Maximum over interval
                  </li>
                  <li>
                    <strong>sum</strong>: Sum over interval (e.g., energy consumption)
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-medium mb-2">Granularity Intervals:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>PT1M (1 minute), PT5M (5 minutes), PT15M (15 minutes)</li>
                  <li>PT1H (1 hour), PT6H (6 hours)</li>
                  <li>PT24H (1 day), PT168H (1 week)</li>
                </ul>
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong>Rate Limit:</strong> 750 requests. Use aggregation and appropriate
                  intervals for large data ranges.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * LineMetrics Data Import Dialog
 */
export function LineMetricsImportDialog({ config }: { config: LineMetricsConfig }) {
  const [open, setOpen] = useState(false);
  const [streamIds, setStreamIds] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [aggregation, setAggregation] = useState<
    'last_value' | 'avg' | 'min' | 'max' | 'sum'
  >('avg');
  const [granularity, setGranularity] = useState<
    'PT1M' | 'PT5M' | 'PT15M' | 'PT1H' | 'PT6H' | 'PT24H' | 'PT168H'
  >('PT15M');

  const importData = useLineMetricsImport();

  const handleImport = async () => {
    const ids = streamIds
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      toast.error('Please enter at least one stream ID');
      return;
    }

    try {
      await importData.mutateAsync({
        config,
        streamIds: ids,
        fromTime: new Date(dateRange.from),
        toTime: new Date(dateRange.to),
        aggregation,
        interval: granularity,
      });
      setOpen(false);
    } catch (error) {
      // Error already handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="mt-4">
          <Download className="mr-2 h-4 w-4" />
          Import Historical Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Import Historical Data</DialogTitle>
          <DialogDescription>
            Import measurements from LineMetrics for specified input streams
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="stream-ids">Device Input IDs</Label>
            <Input
              id="stream-ids"
              value={streamIds}
              onChange={(e) => setStreamIds(e.target.value)}
              placeholder="e.g., input-1, input-2, input-3"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of device input IDs to import
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-date">From Date</Label>
              <Input
                id="from-date"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">To Date</Label>
              <Input
                id="to-date"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aggregation">Aggregation Function</Label>
            <select
              id="aggregation"
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as any)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="last_value">Last Value</option>
              <option value="avg">Average</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
              <option value="sum">Sum</option>
            </select>
            <p className="text-xs text-muted-foreground">
              How to aggregate data points over each interval
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="granularity">Granularity (Interval)</Label>
            <select
              id="granularity"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as any)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="PT1M">1 minute (PT1M)</option>
              <option value="PT5M">5 minutes (PT5M)</option>
              <option value="PT15M">15 minutes (PT15M)</option>
              <option value="PT1H">1 hour (PT1H)</option>
              <option value="PT6H">6 hours (PT6H)</option>
              <option value="PT24H">1 day (PT24H)</option>
              <option value="PT168H">1 week (PT168H)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Time interval for aggregation (ISO 8601 duration format)
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Large date ranges may take time to import. Consider using coarser granularity (e.g.,
              PT1H or PT24H) for longer periods.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={importData.isPending}>
            {importData.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Data'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
