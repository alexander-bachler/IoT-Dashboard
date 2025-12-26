'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useDashboardStore } from '@/lib/stores/dashboard-store';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

export function ExportDashboardData() {
  const [isExporting, setIsExporting] = useState(false);
  const { widgets } = useDashboardStore();

  const exportToCSV = async () => {
    if (widgets.length === 0) {
      toast.error('No widgets to export');
      return;
    }

    setIsExporting(true);
    try {
      const allData: any[] = [];

      // Fetch data for each widget
      for (const widget of widgets) {
        const end = new Date();
        const start = new Date();

        // Calculate time range
        switch (widget.timeRange?.value) {
          case 'last_hour':
            start.setHours(start.getHours() - 1);
            break;
          case 'last_24h':
            start.setDate(start.getDate() - 1);
            break;
          case 'last_7d':
            start.setDate(start.getDate() - 7);
            break;
          default:
            start.setDate(start.getDate() - 1);
        }

        try {
          const response = await apiClient.post('/api/v1/measurements/query', {
            metric_ids: widget.metricIds,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
          });

          const data = response.data;

          // Flatten data for CSV
          data.forEach((series: any) => {
            series.data.forEach((point: any) => {
              allData.push({
                widget_title: widget.title,
                metric_name: series.metric_name,
                metric_unit: series.metric_unit || '',
                time: point.time,
                value: point.value,
                quality: point.quality || '',
              });
            });
          });
        } catch {
          continue;
        }
      }

      if (allData.length === 0) {
        toast.warning('No data available to export');
        setIsExporting(false);
        return;
      }

      // Convert to CSV
      const headers = Object.keys(allData[0]);
      const csvContent = [
        headers.join(','),
        ...allData.map(row =>
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          }).join(',')
        ),
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${allData.length} data points to CSV`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to export data');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = async () => {
    if (widgets.length === 0) {
      toast.error('No widgets to export');
      return;
    }

    setIsExporting(true);
    try {
      const exportData: any = {
        exported_at: new Date().toISOString(),
        dashboard_widgets: [],
      };

      // Fetch data for each widget
      for (const widget of widgets) {
        const end = new Date();
        const start = new Date();

        // Calculate time range
        switch (widget.timeRange?.value) {
          case 'last_hour':
            start.setHours(start.getHours() - 1);
            break;
          case 'last_24h':
            start.setDate(start.getDate() - 1);
            break;
          case 'last_7d':
            start.setDate(start.getDate() - 7);
            break;
          default:
            start.setDate(start.getDate() - 1);
        }

        try {
          const response = await apiClient.post('/api/v1/measurements/query', {
            metric_ids: widget.metricIds,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
          });

          const data = response.data;

          exportData.dashboard_widgets.push({
            widget: {
              title: widget.title,
              chart_type: widget.chartType,
              time_range: widget.timeRange,
            },
            data: data,
          });
        } catch {
          continue;
        }
      }

      if (exportData.dashboard_widgets.length === 0) {
        toast.warning('No data available to export');
        setIsExporting(false);
        return;
      }

      // Download JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportData.dashboard_widgets.length} widgets to JSON`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to export data');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || widgets.length === 0}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileJson className="mr-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
