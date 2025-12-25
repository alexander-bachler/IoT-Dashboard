'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDashboardStore } from '@/lib/stores/dashboard-store';
import {
  useDashboards,
  useCreateDashboard,
  useUpdateDashboard,
  useDeleteDashboard,
  useDashboard,
} from '@/lib/hooks/use-dashboards';
import { Save, FolderOpen, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DashboardLayout } from '@/lib/api/types';

export function DashboardManager() {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>('');

  const { currentDashboardId, setCurrentDashboardId, layout, widgets, reset } =
    useDashboardStore();

  const { data: dashboards, isLoading: isLoadingDashboards } = useDashboards();
  const { data: currentDashboard } = useDashboard(currentDashboardId);
  const createDashboard = useCreateDashboard();
  const updateDashboard = useUpdateDashboard();
  const deleteDashboard = useDeleteDashboard();

  // Convert local state to dashboard layout format
  const getDashboardLayout = (): DashboardLayout => {
    return {
      widgets: widgets.map((widget) => {
        const position = layout.find((l) => l.i === widget.id);
        return {
          id: widget.id,
          type: 'chart',
          title: widget.title,
          position: {
            x: position?.x || 0,
            y: position?.y || 0,
            w: position?.w || 6,
            h: position?.h || 4,
          },
          config: {
            chartType: widget.chartType,
            metricIds: widget.metricIds,
            deviceId: widget.deviceId,
            timeRange: widget.timeRange,
            aggregationInterval: widget.aggregationInterval,
            refreshInterval: widget.refreshInterval,
          },
        };
      }),
    };
  };

  // Load dashboard into local state
  const loadDashboard = (dashboard: any) => {
    reset();
    setCurrentDashboardId(dashboard.id);

    // Convert backend format to local store format
    dashboard.layout.widgets.forEach((widget: any) => {
      const { addWidget, setLayout } = useDashboardStore.getState();

      addWidget(
        {
          id: widget.id,
          title: widget.title,
          chartType: widget.config.chartType,
          metricIds: widget.config.metricIds || [],
          deviceId: widget.config.deviceId || '',
          timeRange: widget.config.timeRange || { type: 'relative', value: 'last_24h' },
          aggregationInterval: widget.config.aggregationInterval,
          refreshInterval: widget.config.refreshInterval,
        },
        {
          i: widget.id,
          x: widget.position.x,
          y: widget.position.y,
          w: widget.position.w,
          h: widget.position.h,
          minW: 3,
          minH: 3,
        }
      );
    });
  };

  const handleSave = async () => {
    if (!dashboardName.trim()) {
      toast.error('Please enter a dashboard name');
      return;
    }

    const dashboardData = {
      name: dashboardName,
      description: dashboardDescription || undefined,
      layout: getDashboardLayout(),
    };

    if (currentDashboardId) {
      // Update existing dashboard
      await updateDashboard.mutateAsync({
        id: currentDashboardId,
        data: dashboardData,
      });
    } else {
      // Create new dashboard
      const newDashboard = await createDashboard.mutateAsync(dashboardData);
      if (newDashboard) {
        setCurrentDashboardId(newDashboard.id);
      }
    }

    setIsSaveDialogOpen(false);
    setDashboardName('');
    setDashboardDescription('');
  };

  const handleLoad = () => {
    if (!selectedDashboardId) {
      toast.error('Please select a dashboard');
      return;
    }

    const dashboard = dashboards?.find((d) => d.id === selectedDashboardId);
    if (dashboard) {
      loadDashboard(dashboard);
      toast.success(`Loaded dashboard: ${dashboard.name}`);
      setIsLoadDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!currentDashboardId) {
      toast.error('No dashboard selected');
      return;
    }

    if (window.confirm('Are you sure you want to delete this dashboard?')) {
      await deleteDashboard.mutateAsync(currentDashboardId);
      reset();
      setCurrentDashboardId(null);
    }
  };

  const handleNew = () => {
    if (widgets.length > 0) {
      if (window.confirm('This will clear the current dashboard. Continue?')) {
        reset();
        setCurrentDashboardId(null);
        toast.success('New dashboard created');
      }
    } else {
      reset();
      setCurrentDashboardId(null);
    }
  };

  // Auto-populate name when saving current dashboard
  const handleSaveDialogOpen = () => {
    if (currentDashboard) {
      setDashboardName(currentDashboard.name);
      setDashboardDescription(currentDashboard.description || '');
    } else {
      setDashboardName('');
      setDashboardDescription('');
    }
    setIsSaveDialogOpen(true);
  };

  return (
    <div className="flex gap-2">
      {/* New Dashboard */}
      <Button variant="outline" size="sm" onClick={handleNew}>
        <Plus className="mr-2 h-4 w-4" />
        New
      </Button>

      {/* Load Dashboard */}
      <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderOpen className="mr-2 h-4 w-4" />
            Load
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Load Dashboard</DialogTitle>
            <DialogDescription>
              Select a saved dashboard to load
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dashboard-select">Dashboard</Label>
              {isLoadingDashboards ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : dashboards && dashboards.length > 0 ? (
                <Select value={selectedDashboardId} onValueChange={setSelectedDashboardId}>
                  <SelectTrigger id="dashboard-select">
                    <SelectValue placeholder="Select a dashboard" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboards.map((dashboard) => (
                      <SelectItem key={dashboard.id} value={dashboard.id}>
                        <div>
                          <div className="font-medium">{dashboard.name}</div>
                          {dashboard.description && (
                            <div className="text-xs text-muted-foreground">
                              {dashboard.description}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">No saved dashboards found</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLoadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLoad} disabled={!selectedDashboardId}>
              Load Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Dashboard */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={handleSaveDialogOpen}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{currentDashboardId ? 'Update' : 'Save'} Dashboard</DialogTitle>
            <DialogDescription>
              {currentDashboardId
                ? 'Update the current dashboard'
                : 'Save your dashboard layout and widgets'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dashboard-name">Name *</Label>
              <Input
                id="dashboard-name"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                placeholder="My IoT Dashboard"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dashboard-description">Description</Label>
              <Textarea
                id="dashboard-description"
                value={dashboardDescription}
                onChange={(e) => setDashboardDescription(e.target.value)}
                placeholder="Enter a description for this dashboard"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createDashboard.isPending || updateDashboard.isPending}
            >
              {createDashboard.isPending || updateDashboard.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Dashboard'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dashboard */}
      {currentDashboardId && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleteDashboard.isPending}
        >
          {deleteDashboard.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Delete
        </Button>
      )}
    </div>
  );
}
