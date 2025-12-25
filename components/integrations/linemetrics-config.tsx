'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  useLineMetricsConnection,
  useLineMetricsDevices,
  useLineMetricsSync,
  useLineMetricsImport,
} from '@/lib/hooks/use-linemetrics';
import type { LineMetricsConfig, LineMetricsQueryParams } from '@/lib/integrations/linemetrics-client';
import { Loader2, Download, RefreshCw, CheckCircle2, XCircle, Database } from 'lucide-react';
import { toast } from 'sonner';

export function LineMetricsConfiguration() {
  const [config, setConfig] = useState<LineMetricsConfig>({
    apiUrl: process.env.NEXT_PUBLIC_LINEMETRICS_API_URL || 'https://api.linemetrics.com/v2',
    apiKey: '',
    username: '',
    password: '',
  });

  const [authMethod, setAuthMethod] = useState<'apikey' | 'credentials'>('apikey');
  const [isConnected, setIsConnected] = useState(false);

  const connectionTest = useLineMetricsConnection();
  const { data: devices, isLoading: devicesLoading } = useLineMetricsDevices(
    isConnected ? config : undefined
  );
  const syncDevices = useLineMetricsSync();
  const importData = useLineMetricsImport();

  const handleTestConnection = async () => {
    const testConfig = {
      ...config,
      // Clear unused auth fields
      ...(authMethod === 'apikey'
        ? { username: undefined, password: undefined }
        : { apiKey: undefined }),
    };

    const result = await connectionTest.mutateAsync();
    setIsConnected(result);

    if (result) {
      setConfig(testConfig);
    }
  };

  const handleSync = async () => {
    await syncDevices.mutateAsync(config);
  };

  const handleImport = async () => {
    // Import last 24 hours of data
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (!devices || devices.length === 0) {
      toast.error('No devices found. Please test connection first.');
      return;
    }

    // Get all stream IDs from devices
    const streamIds = devices.flatMap((device) =>
      (device.streams || []).map((stream) => stream.id)
    );

    if (streamIds.length === 0) {
      toast.error('No streams found in devices');
      return;
    }

    const params: LineMetricsQueryParams = {
      streamIds,
      from: yesterday.toISOString(),
      to: now.toISOString(),
      aggregation: 'none',
    };

    await importData.mutateAsync({ config, params });
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
            Connect to your LineMetrics account to import devices and measurements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="apikey">API Key</TabsTrigger>
              <TabsTrigger value="credentials">Username & Password</TabsTrigger>
            </TabsList>

            <TabsContent value="apikey" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">API URL</Label>
                <Input
                  id="api-url"
                  value={config.apiUrl}
                  onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                  placeholder="https://api.linemetrics.com/v2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="Enter your LineMetrics API key"
                />
                <p className="text-xs text-muted-foreground">
                  You can find your API key in your LineMetrics account settings
                </p>
              </div>
            </TabsContent>

            <TabsContent value="credentials" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="api-url-creds">API URL</Label>
                <Input
                  id="api-url-creds"
                  value={config.apiUrl}
                  onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                  placeholder="https://api.linemetrics.com/v2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={config.username || ''}
                  onChange={(e) => setConfig({ ...config, username: e.target.value })}
                  placeholder="Enter your LineMetrics username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={config.password || ''}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                  placeholder="Enter your LineMetrics password"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={handleTestConnection}
              disabled={connectionTest.isPending}
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

            {isConnected && (
              <>
                <Button
                  onClick={handleSync}
                  disabled={syncDevices.isPending || devicesLoading}
                  variant="outline"
                >
                  {syncDevices.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Devices
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleImport}
                  disabled={importData.isPending || devicesLoading}
                  variant="outline"
                >
                  {importData.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Import Data (24h)
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isConnected && devices && devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Devices</CardTitle>
            <CardDescription>
              {devices.length} device{devices.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {device.location || 'No location'}
                      {device.streams && ` • ${device.streams.length} streams`}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              ))}
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
export function LineMetricsImportDialog({
  config,
  streamIds,
}: {
  config: LineMetricsConfig;
  streamIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [aggregation, setAggregation] = useState<'none' | 'avg' | 'min' | 'max' | 'sum'>('none');
  const [interval, setInterval] = useState('');

  const importData = useLineMetricsImport();

  const handleImport = async () => {
    const params: LineMetricsQueryParams = {
      streamIds,
      from: new Date(dateRange.from).toISOString(),
      to: new Date(dateRange.to).toISOString(),
      aggregation,
      interval: interval || undefined,
    };

    await importData.mutateAsync({ config, params });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Import Historical Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Historical Data</DialogTitle>
          <DialogDescription>
            Import measurements from LineMetrics for the selected streams
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
            <Label htmlFor="aggregation">Aggregation</Label>
            <select
              id="aggregation"
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as any)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="none">None (Raw data)</option>
              <option value="avg">Average</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
              <option value="sum">Sum</option>
            </select>
          </div>

          {aggregation !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="interval">Interval</Label>
              <Input
                id="interval"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                placeholder="e.g., 1h, 15m, 1d"
              />
              <p className="text-xs text-muted-foreground">
                Examples: 15m (15 minutes), 1h (1 hour), 1d (1 day)
              </p>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Importing {streamIds.length} stream{streamIds.length !== 1 ? 's' : ''}
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
