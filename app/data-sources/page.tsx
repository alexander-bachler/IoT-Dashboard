'use client';

import { useState } from 'react';
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
import { Database, Plus, RefreshCw, CheckCircle, XCircle, Activity, TrendingUp, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useDataSources, useCreateDataSource, useSyncDataSource, useDeleteDataSource, useDataSourceStats } from '@/lib/hooks/use-data-sources';
import { DataSourceSkeleton } from '@/components/ui/skeleton-loader';
import { NoDataSourcesState, ErrorState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Badge } from '@/components/ui/badge';

function DataSourceCard({ source }: { source: any }) {
  const { mutate: syncData, isPending: isSyncing } = useSyncDataSource();
  const { mutate: deleteSource, isPending: isDeleting } = useDeleteDataSource();
  const { data: stats } = useDataSourceStats(source.id);

  const handleSync = () => {
    syncData(source.id);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${source.name}"?`)) {
      deleteSource(source.id);
    }
  };

  const statusColor = source.status === 'active' ? 'text-green-500' : source.status === 'error' ? 'text-red-500' : 'text-gray-500';
  const StatusIcon = source.status === 'active' ? CheckCircle : XCircle;

  return (
    <Card className="glass-card hover-scale">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20">
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
          <p className="text-sm">
            {source.last_sync ? format(new Date(source.last_sync), 'PPp') : 'Never'}
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
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
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
    </Card>
  );
}

function AddDataSourceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'api' | 'mqtt' | 'database' | 'file'>('api');
  const [apiUrl, setApiUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [description, setDescription] = useState('');

  const { mutate: createSource, isPending } = useCreateDataSource();

  const handleSubmit = () => {
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
          // Reset form
          setName('');
          setType('api');
          setApiUrl('');
          setApiToken('');
          setDescription('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
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
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="mqtt">MQTT</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="file">File</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !apiUrl || !apiToken || isPending}>
            {isPending ? 'Adding...' : 'Add Source'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DataSourcesContent() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { data, isLoading, error, refetch } = useDataSources({ page: 1, page_size: 50 });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DataSourceSkeleton />
        <DataSourceSkeleton />
        <DataSourceSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Failed to load data sources" description={error.message} onRetry={refetch} />;
  }

  const dataSources = data?.data || [];

  if (dataSources.length === 0) {
    return (
      <>
        <NoDataSourcesState onAdd={() => setIsAddDialogOpen(true)} />
        <AddDataSourceDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      </>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dataSources.map((source) => (
          <DataSourceCard key={source.id} source={source} />
        ))}
      </div>
      <AddDataSourceDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </>
  );
}

export default function DataSourcesPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { data } = useDataSources({ page: 1, page_size: 50 });

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        {/* Gradient orbs for depth */}
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="section-header">Data Sources</h1>
            <p className="text-muted-foreground mt-2">
              Manage connections to your IoT data providers and platforms
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Data Source
          </Button>
        </div>

        {/* Stats Cards */}
        {data && data.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="metric-card hover-scale">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Database className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Sources</div>
                  <div className="text-2xl font-bold gradient-text">{data.total}</div>
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
                  <div className="text-2xl font-bold gradient-text">
                    {data.data.filter((s) => s.status === 'active').length}
                  </div>
                </div>
              </div>
            </div>

            <div className="metric-card hover-scale">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                  <div className="text-2xl font-bold gradient-text">
                    {data.data.filter((s) => s.status === 'error').length}
                  </div>
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
                  <div className="text-2xl font-bold gradient-text">
                    {data.data.reduce((acc, s) => acc + (s.device_count || 0), 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Sources List */}
        <DataSourcesContent />
      </div>
    </ErrorBoundary>
  );
}
