'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileSpreadsheet, FileBarChart } from 'lucide-react';
import { downloadCSV, downloadJSON, downloadStatisticsSummary } from '@/lib/utils/export';

interface Series {
  metricName: string;
  metricUnit?: string;
  data: Array<{ time: string; value: number }>;
}

interface ExportMenuProps {
  series: Series[];
  disabled?: boolean;
}

export function ExportMenu({ series, disabled }: ExportMenuProps) {
  const handleExportCSV = () => {
    downloadCSV(series);
  };

  const handleExportJSON = () => {
    downloadJSON(series);
  };

  const handleExportStatistics = () => {
    downloadStatisticsSummary(series);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || series.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON}>
          <FileJson className="mr-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportStatistics}>
          <FileBarChart className="mr-2 h-4 w-4" />
          Export Statistics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
