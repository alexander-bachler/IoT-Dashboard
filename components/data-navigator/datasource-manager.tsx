'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Database, Plus, RefreshCw, CheckCircle, XCircle, Activity, TrendingUp, Trash2, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useDataSources, useCreateDataSource, useSyncDataSource, useDeleteDataSource, useDataSourceStats } from '@/lib/hooks/use-data-sources';
import apiClient from '@/lib/api/client';
import { DataSourceSkeleton } from '@/components/ui/skeleton-loader';
import { NoDataSourcesState, ErrorState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Badge } from '@/components/ui/badge';
import { LineMetricsImportDialog } from '@/components/data-sources/linemetrics-import-dialog';
import { FileImportDialog } from '@/components/data-sources/file-import-dialog';
import { toast } from 'sonner';

function DataSourceCard({ source }: { source: any }) {
  const [mounted, setMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isFileImportDialogOpen, setIsFileImportDialogOpen] = useState(false);
  const { mutate: syncData, isPending: isSyncing } = useSyncDataSource();
  const { mutate: deleteSource, isPending: isDeleting } = useDeleteDataSource();
  const { data: stats } = useDataSourceStats(source.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLineMetrics = source.type === 'linemetrics';
  const isFile = source.type === 'file';

  const handleSync = async () => {
    if (isLineMetrics) {
      // LineMetrics-specific sync
      setSyncing(true);
      try {
        const response = await apiClient.post(`/api/v1/linemetrics/${source.id}/sync`);
        const result = response.data;
        toast.success(
          `Synced ${result.devices_created + result.devices_updated} devices and ${result.metrics_created} metrics`
        );

        // Refresh stats
        window.location.reload();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || error.message || 'Failed to sync LineMetrics data');
      } finally {
        setSyncing(false);
      }
    } else {
      // Generic sync
      syncData(source.id);
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${source.name}"?`)) {
      deleteSource(source.id);
    }
  };

  const statusColor = source.is_active ? 'text-green-500' : 'text-red-500';
  const StatusIcon = source.is_active ? CheckCircle : XCircle;

  return (
    <Card className="glass-card hover-scale">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <Database className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">{source.name}</CardTitle>
              <CardDescription className="text-xs mt-1">
                <Badge variant="outline" className="uppercase">
                  {source.type}
                </Badge>
              </CardDescription>
            </div>
          </div>
          <StatusIcon className={`h-5 w-5 ${statusColor}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API URL */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">API URL</p>
          <p className="text-sm font-mono truncate bg-muted/50 px-2 py-1 rounded">
            {source.api_url || 'Not configured'}
          </p>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded bg-blue-500/10 border border-blue-500/20">
              <div className="text-xs text-muted-foreground">Devices</div>
              <div className="text-lg font-bold gradient-text">{stats.device_count}</div>
            </div>
            <div className="text-center p-2 rounded bg-purple-500/10 border border-purple-500/20">
              <div className="text-xs text-muted-foreground">Metrics</div>
              <div className="text-lg font-bold gradient-text">{stats.metric_count}</div>
            </div>
            <div className="text-center p-2 rounded bg-green-500/10 border border-green-500/20">
              <div className="text-xs text-muted-foreground">Measurements</div>
              <div className="text-lg font-bold gradient-text">
                {(stats.measurement_count / 1000).toFixed(0)}k
              </div>
            </div>
          </div>
        )}

        {/* Last Sync */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Last Sync</p>
          <p className="text-sm" suppressHydrationWarning>
            {mounted && source.last_sync ? format(new Date(source.last_sync), 'PPp') : (source.last_sync ? '...' : 'Never')}
          </p>
        </div>

        {/* Description */}
        {source.description && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{source.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleSync}
            disabled={syncing || isSyncing}
          >
            <RefreshCw className={`h-4 w-4 ${(syncing || isSyncing) ? 'animate-spin' : ''}`} />
            {(syncing || isSyncing) ? 'Syncing...' : 'Sync'}
          </Button>

          {isLineMetrics && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsImportDialogOpen(true)}
              title="Import measurements"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          {isFile && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFileImportDialogOpen(true)}
              title="Import file to database"
            >
              <Database className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      {/* LineMetrics Import Dialog */}
      {isLineMetrics && (
        <LineMetricsImportDialog
          datasourceId={source.id}
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {/* File Import Dialog */}
      {isFile && (
        <FileImportDialog
          datasourceId={source.id}
          open={isFileImportDialogOpen}
          onOpenChange={setIsFileImportDialogOpen}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </Card>
  );
}

function AddDataSourceDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess?: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'api' | 'mqtt' | 'database' | 'file' | 'linemetrics'>('api');
  const [apiUrl, setApiUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [lmUsername, setLmUsername] = useState('');
  const [lmPassword, setLmPassword] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { mutate: createSource, isPending } = useCreateDataSource();

  const handleSubmit = async () => {
    if (type === 'linemetrics') {
      // Handle LineMetrics separately
      setLoading(true);
      try {
        const response = await apiClient.post('/api/v1/linemetrics/datasource', {
          name: name,
          api_url: apiUrl,
          client_id: clientId,
          client_secret: clientSecret,
          username: lmUsername,
          password: lmPassword,
        });

        const result = response.data;
        toast.success(
          `LineMetrics data source "${result.name}" created successfully! Found ${result.device_count} devices.`
        );

        resetForm();
        onOpenChange(false);

        if (onSuccess) {
          onSuccess();
        }
      } catch (error: any) {
        toast.error(error.response?.data?.detail || error.message || 'Failed to create LineMetrics data source');
      } finally {
        setLoading(false);
      }
    } else if (type === 'file') {
      // Handle file-based data sources
      setLoading(true);
      try {
        // First create the data source
        const createResponse = await apiClient.post('/api/v1/data-sources', {
          name,
          type: 'file',
          api_url: '',
          api_token: '',
          description,
        });

        const createdSource = createResponse.data;

        // If a file is selected, upload it
        if (selectedFile) {
          const formData = new FormData();
          formData.append('file', selectedFile);

          const uploadResponse = await apiClient.post(
            `/api/v1/data-sources/${createdSource.id}/upload`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );

          const uploadResult = uploadResponse.data;
          toast.success(
            `File "${selectedFile.name}" uploaded successfully! ${uploadResult.file_stats.rows || 0} rows detected.`
          );
        } else {
          toast.success(`File data source "${name}" created successfully!`);
        }

        resetForm();
        onOpenChange(false);

        if (onSuccess) {
          onSuccess();
        }
      } catch (error: any) {
        toast.error(error.response?.data?.detail || error.message || 'Failed to create file data source');
      } finally {
        setLoading(false);
      }
    } else {
      // Handle generic data sources
      createSource(
        {
          name,
          type,
          api_url: apiUrl,
          api_token: apiToken,
          description,
        },
        {
          onSuccess: () => {
            resetForm();
            onOpenChange(false);

            if (onSuccess) {
              onSuccess();
            }
          },
        }
      );
    }
  };

  const resetForm = () => {
    setName('');
    setType('api');
    setApiUrl('');
    setApiToken('');
    setClientId('');
    setClientSecret('');
    setLmUsername('');
    setLmPassword('');
    setDescription('');
    setSelectedFile(null);
  };

  // Set default API URL when type changes to LineMetrics
  useEffect(() => {
    if (type === 'linemetrics' && !apiUrl) {
      setApiUrl('https://rest-api.linemetrics.com');
    }
  }, [type]);

  const isSubmitDisabled = () => {
    if (type === 'linemetrics') {
      return !name || !apiUrl || !clientId || !clientSecret || !lmUsername || !lmPassword || loading;
    }
    if (type === 'file') {
      return !name || loading;
    }
    return !name || !apiUrl || !apiToken || isPending;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add Data Source</DialogTitle>
          <DialogDescription>
            Connect to an IoT platform or database to start analyzing your data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Environment"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linemetrics">LineMetrics</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="mqtt">MQTT</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="file">File</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional fields based on type */}
          {type === 'file' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload File</Label>
                <div className="border-2 border-dashed rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls,.json,.parquet"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                    {selectedFile ? (
                      <div className="text-center">
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm font-medium">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground">
                          CSV, Excel, JSON, or Parquet files
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </>
          ) : type === 'linemetrics' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL *</Label>
                <Input
                  id="apiUrl"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://rest-api.linemetrics.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID *</Label>
                <Input
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Your LineMetrics OAuth2 Client ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret *</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Your LineMetrics OAuth2 Client Secret"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lmUsername">Username (Email) *</Label>
                <Input
                  id="lmUsername"
                  value={lmUsername}
                  onChange={(e) => setLmUsername(e.target.value)}
                  placeholder="Your LineMetrics account email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lmPassword">Password *</Label>
                <Input
                  id="lmPassword"
                  type="password"
                  value={lmPassword}
                  onChange={(e) => setLmPassword(e.target.value)}
                  placeholder="Your LineMetrics account password"
                />
                <p className="text-xs text-muted-foreground">
                  LineMetrics uses the OAuth2 password grant; credentials are stored
                  server-side with this connection.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL *</Label>
                <Input
                  id="apiUrl"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com/v1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiToken">API Token *</Label>
                <Input
                  id="apiToken"
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Your API authentication token"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending || loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled()}>
            {(isPending || loading) ? 'Adding...' : 'Add Source'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatsCards({ dataSources }: { dataSources: any[] }) {
  if (!dataSources || dataSources.length === 0) return null;

  const activeCount = dataSources.filter((s) => s?.is_active).length;
  const inactiveCount = dataSources.filter((s) => !s?.is_active).length;
  const totalDevices = dataSources.reduce((acc, s) => acc + (s?.device_count || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="metric-card hover-scale">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Database className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Sources</div>
            <div className="text-2xl font-bold gradient-text">{dataSources.length}</div>
          </div>
        </div>
      </div>

      <div className="metric-card hover-scale">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Activity className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Active</div>
            <div className="text-2xl font-bold gradient-text">{activeCount}</div>
          </div>
        </div>
      </div>

      <div className="metric-card hover-scale">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Inactive</div>
            <div className="text-2xl font-bold gradient-text">{inactiveCount}</div>
          </div>
        </div>
      </div>

      <div className="metric-card hover-scale">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Devices</div>
            <div className="text-2xl font-bold gradient-text">{totalDevices}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DataSourceManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const { data, isLoading, error, refetch } = useDataSources(
    { page: 1, page_size: 50 },
    { enabled: isAuthenticated && mounted }
  );

  // API returns an array directly.
  const dataSources = data ?? [];

  const handleAddSuccess = () => {
    refetch();
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Data Sources</h2>
            <p className="text-muted-foreground mt-1">
              Verwalten Sie Verbindungen zu Ihren IoT-Datenanbietern und Plattformen
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Data Source
          </Button>
        </div>

        {/* Stats Cards */}
        <StatsCards dataSources={dataSources} />

        {/* Data Sources List */}
        {!mounted || isLoading || status === 'loading' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataSourceSkeleton />
            <DataSourceSkeleton />
            <DataSourceSkeleton />
          </div>
        ) : error ? (
          <ErrorState title="Failed to load data sources" description={error.message} onRetry={refetch} />
        ) : dataSources.length === 0 ? (
          <NoDataSourcesState onAdd={() => setIsAddDialogOpen(true)} />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataSources.map((source) => (
              <DataSourceCard key={source.id} source={source} />
            ))}
          </div>
        )}

        {/* Add Data Source Dialog */}
        <AddDataSourceDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSuccess={handleAddSuccess}
        />
      </div>
    </ErrorBoundary>
  );
}
