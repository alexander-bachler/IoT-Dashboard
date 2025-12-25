'use client';

import { useState } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function AddLineMetricsDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    apiUrl: 'https://rest-api.linemetrics.com',
    clientId: '',
    clientSecret: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/v1/linemetrics/datasource', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          api_url: formData.apiUrl,
          client_id: formData.clientId,
          client_secret: formData.clientSecret,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create LineMetrics data source');
      }

      const result = await response.json();

      toast.success(
        `LineMetrics data source "${result.name}" created successfully! Found ${result.device_count} devices.`
      );

      // Reset form
      setFormData({
        name: '',
        apiUrl: 'https://rest-api.linemetrics.com',
        clientId: '',
        clientSecret: '',
      });

      setOpen(false);

      // Call onSuccess callback to refresh parent
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create LineMetrics data source');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add LineMetrics Data Source
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add LineMetrics Data Source</DialogTitle>
          <DialogDescription>
            Connect your LineMetrics account to import devices and measurements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My LineMetrics Account"
                required
              />
              <p className="text-xs text-muted-foreground">
                A friendly name for this connection
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-url">API URL</Label>
              <Input
                id="api-url"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                placeholder="https://rest-api.linemetrics.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                LineMetrics REST API v2 endpoint
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                placeholder="Enter your OAuth2 client ID"
                required
              />
              <p className="text-xs text-muted-foreground">
                Get this from your LineMetrics portal
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-secret">Client Secret</Label>
              <Input
                id="client-secret"
                type="password"
                value={formData.clientSecret}
                onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                placeholder="Enter your OAuth2 client secret"
                required
              />
              <p className="text-xs text-muted-foreground">
                Keep this secret secure - it provides full access to your account
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <strong>Security Note:</strong> Your credentials will be stored securely and
                used only to sync data from your LineMetrics account. You can delete this
                connection at any time.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Connect & Create
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
