'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  ScatterChart,
  AreaChart as AreaChartIcon,
  Activity,
  Play,
  Save,
  Plus,
  X,
  Settings2,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const chartTypes = [
  { id: 'line', label: 'Line Chart', icon: LineChartIcon },
  { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { id: 'area', label: 'Area Chart', icon: AreaChartIcon },
  { id: 'pie', label: 'Pie Chart', icon: PieChartIcon },
  { id: 'scatter', label: 'Scatter Plot', icon: ScatterChart },
];

const mockDataSources = [
  { id: 'measurements', label: 'Measurements', table: 'measurements' },
  { id: 'devices', label: 'Devices', table: 'devices' },
  { id: 'metrics', label: 'Metrics', table: 'metrics' },
];

const mockColumns = {
  measurements: ['time', 'metric_id', 'value', 'quality'],
  devices: ['id', 'name', 'location', 'created_at'],
  metrics: ['id', 'name', 'unit', 'data_type'],
};

const mockPreviewData = [
  { name: '00:00', value: 23.5, quality: 95 },
  { name: '01:00', value: 24.2, quality: 97 },
  { name: '02:00', value: 23.8, quality: 96 },
  { name: '03:00', value: 24.5, quality: 98 },
  { name: '04:00', value: 24.1, quality: 94 },
  { name: '05:00', value: 23.9, quality: 96 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export function ChartBuilder() {
  const [chartType, setChartType] = useState('line');
  const [chartTitle, setChartTitle] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState<string[]>([]);
  const [aggregation, setAggregation] = useState('none');
  const [timeRange, setTimeRange] = useState('24h');

  const availableColumns = dataSource ? mockColumns[dataSource as keyof typeof mockColumns] || [] : [];

  const handleAddYAxis = () => {
    if (yAxis.length < 3) {
      setYAxis([...yAxis, '']);
    } else {
      toast.error('Maximum 3 Y-axis series allowed');
    }
  };

  const handleUpdateYAxis = (index: number, value: string) => {
    const updated = [...yAxis];
    updated[index] = value;
    setYAxis(updated);
  };

  const handleRemoveYAxis = (index: number) => {
    setYAxis(yAxis.filter((_, i) => i !== index));
  };

  const handlePreview = () => {
    if (!dataSource || !xAxis || yAxis.length === 0) {
      toast.error('Please configure all required fields');
      return;
    }
    toast.success('Chart preview updated');
  };

  const handleSave = () => {
    if (!chartTitle || !dataSource || !xAxis || yAxis.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success(`Chart "${chartTitle}" saved successfully`);
  };

  const renderChart = () => {
    if (!dataSource || !xAxis || yAxis.length === 0) {
      return (
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          Configure chart settings to see preview
        </div>
      );
    }

    const commonProps = {
      data: mockPreviewData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
            <Legend />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
            <Legend />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={mockPreviewData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label
              outerRadius={120}
              fill="#3b82f6"
              dataKey="value"
            >
              {mockPreviewData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="info-banner">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <BarChart3 className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Interactive Chart Builder</h3>
            <p className="text-sm text-muted-foreground">
              Create custom charts through an intuitive GUI. Select your data source, configure axes,
              and preview your chart in real-time.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Chart Configuration
            </h3>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                {/* Chart Type */}
                <div>
                  <Label className="mb-2 block">Chart Type *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {chartTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <Button
                          key={type.id}
                          variant={chartType === type.id ? 'default' : 'outline'}
                          onClick={() => setChartType(type.id)}
                          className="justify-start gap-2"
                          size="sm"
                        >
                          <Icon className="h-4 w-4" />
                          {type.label.split(' ')[0]}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Chart Title */}
                <div>
                  <Label htmlFor="title">Chart Title *</Label>
                  <Input
                    id="title"
                    value={chartTitle}
                    onChange={(e) => setChartTitle(e.target.value)}
                    placeholder="e.g., Temperature Over Time"
                    className="mt-2"
                  />
                </div>

                {/* Data Source */}
                <div>
                  <Label>Data Source *</Label>
                  <Select value={dataSource} onValueChange={setDataSource}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockDataSources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* X-Axis */}
                <div>
                  <Label>X-Axis *</Label>
                  <Select value={xAxis} onValueChange={setXAxis} disabled={!dataSource}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select X-axis column" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Y-Axis */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Y-Axis * ({yAxis.length}/3)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddYAxis}
                      className="h-7 gap-1"
                      disabled={!dataSource || yAxis.length >= 3}
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {yAxis.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded">
                        Click "Add" to add Y-axis series
                      </div>
                    ) : (
                      yAxis.map((value, index) => (
                        <div key={index} className="flex gap-2">
                          <Select
                            value={value}
                            onValueChange={(v) => handleUpdateYAxis(index, v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Series ${index + 1}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableColumns.map((col) => (
                                <SelectItem key={col} value={col}>
                                  {col}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveYAxis(index)}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                {/* Aggregation */}
                <div>
                  <Label>Aggregation</Label>
                  <Select value={aggregation} onValueChange={setAggregation}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="avg">Average</SelectItem>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="min">Minimum</SelectItem>
                      <SelectItem value="max">Maximum</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Time Range */}
                <div>
                  <Label>Time Range</Label>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last Hour</SelectItem>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 mt-6">
              <Button onClick={handlePreview} variant="outline" className="gap-2 flex-1">
                <Play className="h-4 w-4" />
                Preview
              </Button>
              <Button onClick={handleSave} className="gap-2 flex-1">
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">
                  {chartTitle || 'Untitled Chart'}{' '}
                  <Badge variant="secondary" className="ml-2">
                    {chartTypes.find((t) => t.id === chartType)?.label}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {dataSource ? `Data from ${mockDataSources.find((s) => s.id === dataSource)?.label}` : 'No data source selected'}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 p-4 bg-slate-950/50">
              <ResponsiveContainer width="100%" height={400}>
                {renderChart()}
              </ResponsiveContainer>
            </div>

            {dataSource && xAxis && yAxis.length > 0 && (
              <div className="mt-4 flex gap-4">
                <div className="text-xs">
                  <span className="text-muted-foreground">X-Axis:</span>{' '}
                  <Badge variant="outline" className="ml-1 font-mono">
                    {xAxis}
                  </Badge>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Y-Axis:</span>{' '}
                  {yAxis.map((axis, i) => (
                    <Badge key={i} variant="outline" className="ml-1 font-mono">
                      {axis}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
