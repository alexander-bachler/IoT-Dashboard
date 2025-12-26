'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { DashboardManager } from '@/components/dashboard/dashboard-manager';
import { AddWidgetDialog } from '@/components/dashboard/add-widget-dialog';
import { TemplateSelector } from '@/components/dashboard/template-selector';
import { DataSourceFilter } from '@/components/dashboard/datasource-filter';
import { useDashboardStore } from '@/lib/stores/dashboard-store';
import type { DashboardTemplate } from '@/lib/utils/dashboard-templates';
import { Plus, Edit, Eye } from 'lucide-react';

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your IoT metrics in real-time
            </p>
          </div>
          <div className="flex gap-4">
            <DashboardManager />
            <div className="h-8 w-px bg-border" />
            <div className="flex gap-2">
              <DataSourceFilter />
              <div className="h-8 w-px bg-border" />
              <TemplateSelector onSelectTemplate={handleApplyTemplate} />
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
        </div>

        {widgets.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
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
    </div>
  );
}
