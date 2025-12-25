'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Database, Plus, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface DataSource {
  id: string;
  name: string;
  type: string;
  apiUrl: string;
  isActive: boolean;
  lastSync: string | null;
  createdAt: string;
}

export default function DataSourcesPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/data-sources');
      const data = await response.json();
      setDataSources(data.dataSources || []);
    } catch (error) {
      console.error('Error fetching data sources:', error);
    }
  };

  const handleAddDataSource = async () => {
    try {
      const response = await fetch('/api/data-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          type: 'linemetrics',
          apiUrl,
          apiToken,
          clientId,
        }),
      });

      if (response.ok) {
        setIsAddDialogOpen(false);
        setName('');
        setApiUrl('');
        setApiToken('');
        setClientId('');
        fetchDataSources();
      }
    } catch (error) {
      console.error('Error adding data source:', error);
    }
  };

  const handleSyncMetadata = async (dataSourceId: string) => {
    setIsSyncing(dataSourceId);

    try {
      const response = await fetch('/api/sync/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dataSourceId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          `Sync completed!\nDevices added: ${data.devicesAdded}\nMetrics added: ${data.metricsAdded}`
        );
        fetchDataSources();
      } else {
        alert(`Sync failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error syncing metadata:', error);
      alert('Failed to sync metadata');
    } finally {
      setIsSyncing(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Data Sources</h1>
            <p className="text-muted-foreground">
              Manage connections to your IoT data providers
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Data Source
          </Button>
        </div>

        {dataSources.length === 0 ? (
          <Card className="p-12 text-center">
            <Database className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No data sources yet</h3>
            <p className="text-muted-foreground mb-6">
              Connect to LineMetrics or other IoT platforms to start visualizing your data
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Data Source
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataSources.map((source) => (
              <Card key={source.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      <CardTitle>{source.name}</CardTitle>
                    </div>
                    {source.isActive ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <CardDescription className="uppercase text-xs">
                    {source.type}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">API URL</p>
                    <p className="text-sm font-mono truncate">{source.apiUrl}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Last Sync</p>
                    <p className="text-sm">
                      {source.lastSync
                        ? format(new Date(source.lastSync), 'PPp')
                        : 'Never'}
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSyncMetadata(source.id)}
                      disabled={isSyncing === source.id}
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${
                          isSyncing === source.id ? 'animate-spin' : ''
                        }`}
                      />
                      {isSyncing === source.id ? 'Syncing...' : 'Sync Metadata'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Data Source</DialogTitle>
              <DialogDescription>
                Connect to a LineMetrics account or other IoT platform
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My LineMetrics Account"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL</Label>
                <Input
                  id="apiUrl"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.linemetrics.com/v1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiToken">API Token</Label>
                <Input
                  id="apiToken"
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Your API token"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID (Optional)</Label>
                <Input
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Client ID"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddDataSource}
                disabled={!name || !apiUrl || !apiToken}
              >
                Add Source
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
