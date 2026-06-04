'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { DashboardManager } from '@/components/dashboard/dashboard-manager';
import { AddWidgetDialog } from '@/components/dashboard/add-widget-dialog';
import { TemplateSelector } from '@/components/dashboard/template-selector';
import { DataSourceFilter } from '@/components/dashboard/datasource-filter';
import { ExportDashboardData } from '@/components/dashboard/export-dashboard-data';
import { useDashboardStore } from '@/lib/stores/dashboard-store';
import type { DashboardTemplate } from '@/lib/utils/dashboard-templates';
import { Plus, Edit, Eye, LayoutDashboard } from 'lucide-react';

export default function DashboardsPage() {
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const { isEditMode, setEditMode, widgets, addWidget } = useDashboardStore();

  const handleApplyTemplate = (template: DashboardTemplate) => {
    // Convert template widgets to dashboard widgets
    template.widgets.forEach((widget) => {
      addWidget(
        {
          id: widget.id,
          title: widget.title,
          chartType: widget.chartType,
          deviceId: '',
          metricIds: [],
          timeRange: { type: 'relative', value: 'last_24h' },
        },
        {
          i: widget.id,
          x: widget.layout.x,
          y: widget.layout.y,
          w: widget.layout.w,
          h: widget.layout.h,
          minW: 3,
          minH: 3,
        }
      );
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary">
              <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="section-header mb-0">Dashboards</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor your IoT metrics in real-time
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardManager />
          <div className="hidden h-6 w-px bg-border sm:block" />
          <DataSourceFilter />
          <ExportDashboardData />
          <TemplateSelector onSelectTemplate={handleApplyTemplate} />
          <div className="hidden h-6 w-px bg-border sm:block" />
          <Button
            variant={isEditMode ? 'default' : 'outline'}
            onClick={() => setEditMode(!isEditMode)}
          >
            {isEditMode ? (
              <>
                <Eye className="mr-2 h-4 w-4" />
                View Mode
              </>
            ) : (
              <>
                <Edit className="mr-2 h-4 w-4" />
                Edit Mode
              </>
            )}
          </Button>
          <Button onClick={() => setIsAddWidgetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Widget
          </Button>
        </div>
      </div>

      {widgets.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex max-w-md flex-col items-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <LayoutDashboard className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No widgets yet</h3>
            <p className="text-muted-foreground mb-6">
              Start building your dashboard by adding widgets to visualize your IoT data
            </p>
            <Button onClick={() => setIsAddWidgetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Widget
            </Button>
          </div>
        </Card>
      ) : (
        <DashboardGrid />
      )}

      <AddWidgetDialog
        open={isAddWidgetOpen}
        onOpenChange={setIsAddWidgetOpen}
      />
    </div>
  );
}
