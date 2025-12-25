'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataRow {
  [key: string]: any;
}

interface DataPreviewProps {
  nodeId?: string;
  nodeLabel?: string;
  inputData?: DataRow[];
  outputData?: DataRow[];
  rowsProcessed?: number;
  className?: string;
}

const mockInputData: DataRow[] = [
  {
    time: '2025-01-15 10:00:00',
    metric_id: 'a1b2c3d4',
    value: 23.5,
    quality: 95,
    device_name: 'Sensor-01',
  },
  {
    time: '2025-01-15 10:01:00',
    metric_id: 'a1b2c3d4',
    value: 23.7,
    quality: 98,
    device_name: 'Sensor-01',
  },
  {
    time: '2025-01-15 10:02:00',
    metric_id: 'a1b2c3d4',
    value: 23.6,
    quality: 97,
    device_name: 'Sensor-01',
  },
  {
    time: '2025-01-15 10:03:00',
    metric_id: 'b5c6d7e8',
    value: 45.2,
    quality: 92,
    device_name: 'Sensor-02',
  },
  {
    time: '2025-01-15 10:04:00',
    metric_id: 'b5c6d7e8',
    value: 45.8,
    quality: 94,
    device_name: 'Sensor-02',
  },
];

const mockOutputData: DataRow[] = [
  { time: '2025-01-15 10:00:00', metric_id: 'a1b2c3d4', avg_value: 23.6 },
  { time: '2025-01-15 10:00:00', metric_id: 'b5c6d7e8', avg_value: 45.5 },
];

export function DataPreviewPanel({
  nodeId,
  nodeLabel = 'Transformation Step',
  inputData = mockInputData,
  outputData = mockOutputData,
  rowsProcessed = 18000,
  className,
}: DataPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="gap-2"
      >
        <Eye className="h-4 w-4" />
        Show Data Preview
      </Button>
    );
  }

  const renderTable = (data: DataRow[], label: string) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No data available
        </div>
      );
    }

    const columns = Object.keys(data[0]);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);
    const totalPages = Math.ceil(data.length / rowsPerPage);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              {data.length} rows
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {columns.length} columns
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="gap-2">
            <Download className="h-3.5 w-3.5" />
            Export Sample
          </Button>
        </div>

        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {columns.map((col) => (
                  <TableHead key={col} className="font-semibold text-xs uppercase">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, idx) => (
                <TableRow key={idx} className="hover:bg-muted/30">
                  {columns.map((col) => (
                    <TableCell key={col} className="font-mono text-xs">
                      {typeof row[col] === 'number'
                        ? row[col].toLocaleString()
                        : row[col]?.toString() || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, data.length)} of {data.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentPage(i + 1)}
                    className="w-8 h-8 p-0"
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold text-sm mb-1">Data Preview: {nodeLabel}</h4>
          <p className="text-xs text-muted-foreground">
            Sample of {rowsProcessed.toLocaleString()} rows processed
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="gap-2"
        >
          <EyeOff className="h-4 w-4" />
          Hide
        </Button>
      </div>

      <Tabs defaultValue="output" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="input">Input Data</TabsTrigger>
          <TabsTrigger value="output">Output Data</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="mt-4">
          {renderTable(inputData, 'Input')}
        </TabsContent>

        <TabsContent value="output" className="mt-4">
          {renderTable(outputData, 'Output')}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
