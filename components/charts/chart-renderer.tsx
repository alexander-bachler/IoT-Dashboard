'use client';

import { TimeSeriesChart } from '../explorer/time-series-chart';
import { ScatterPlot } from './scatter-plot';
import { Heatmap } from './heatmap';
import { GaugeChart } from './gauge-chart';
import { RadarChart } from './radar-chart';
import { PieChart } from './pie-chart';
import { Treemap } from './treemap';
import { Boxplot } from './boxplot';
import { FunnelChart } from './funnel-chart';
import { SankeyDiagram } from './sankey-diagram';
import type { ChartType } from '@/lib/stores/explorer-store';

interface Series {
  metricId: string;
  metricName: string;
  metricUnit?: string;
  data: Array<{
    time: string;
    value: number;
  }>;
}

interface ChartRendererProps {
  chartType: ChartType;
  series: Series[];
  isLoading?: boolean;
  customConfig?: Record<string, any>;
}

/**
 * Unified Chart Renderer Component
 * Automatically selects the appropriate chart based on type
 */
export function ChartRenderer({
  chartType,
  series,
  isLoading,
  customConfig = {},
}: ChartRendererProps) {
  // Time-series charts (line, bar, area, scatter as time-series)
  if (['line', 'bar', 'area'].includes(chartType)) {
    return (
      <TimeSeriesChart
        series={series}
        chartType={chartType as 'line' | 'bar' | 'area'}
        isLoading={isLoading}
      />
    );
  }

  // Scatter plot (2D correlation)
  if (chartType === 'scatter') {
    return (
      <ScatterPlot
        series={series}
        isLoading={isLoading}
        xAxisLabel={customConfig.xAxisLabel}
        yAxisLabel={customConfig.yAxisLabel}
      />
    );
  }

  // Gauge (KPI/single value)
  if (chartType === 'gauge') {
    const latestValue = series[0]?.data[series[0].data.length - 1]?.value || 0;
    return (
      <GaugeChart
        value={latestValue}
        title={series[0]?.metricName || 'Gauge'}
        unit={series[0]?.metricUnit}
        isLoading={isLoading}
        min={customConfig.min}
        max={customConfig.max}
        thresholds={customConfig.thresholds}
      />
    );
  }

  // Pie chart (distribution)
  if (chartType === 'pie') {
    const pieData = series.map((s) => ({
      value: s.data.reduce((sum, d) => sum + d.value, 0) / s.data.length,
      name: s.metricName,
    }));

    return (
      <PieChart
        data={pieData}
        title={customConfig.title}
        isDonut={customConfig.isDonut}
        isLoading={isLoading}
      />
    );
  }

  // Radar chart
  if (chartType === 'radar') {
    // Example: use latest values for each metric
    const indicators = series.map((s) => ({
      name: s.metricName,
      max: Math.max(...s.data.map((d) => d.value)),
    }));

    const radarData = [
      {
        value: series.map((s) => s.data[s.data.length - 1]?.value || 0),
        name: 'Current Values',
      },
    ];

    return <RadarChart indicators={indicators} data={radarData} isLoading={isLoading} />;
  }

  // Funnel chart
  if (chartType === 'funnel') {
    const funnelData = series.map((s) => ({
      value: s.data.reduce((sum, d) => sum + d.value, 0),
      name: s.metricName,
    }));

    return (
      <FunnelChart
        data={funnelData}
        title={customConfig.title}
        sort={customConfig.sort}
        isLoading={isLoading}
      />
    );
  }

  // Treemap
  if (chartType === 'treemap') {
    const treemapData = series.map((s) => ({
      name: s.metricName,
      value: s.data.reduce((sum, d) => sum + d.value, 0),
    }));

    return (
      <Treemap
        data={treemapData}
        title={customConfig.title}
        isLoading={isLoading}
      />
    );
  }

  // Boxplot
  if (chartType === 'boxplot') {
    const boxplotData = series.map((s) => ({
      name: s.metricName,
      data: s.data.map((d) => d.value),
    }));

    return <Boxplot data={boxplotData} isLoading={isLoading} />;
  }

  // Heatmap
  if (chartType === 'heatmap') {
    // Transform time-series to heatmap (hour x day)
    const heatmapData = series[0]?.data.map((d, index) => ({
      x: new Date(d.time).getHours(),
      y: Math.floor(index / 24),
      value: d.value,
    })) || [];

    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

    return (
      <Heatmap
        data={heatmapData}
        xAxisLabels={hours}
        yAxisLabels={days}
        isLoading={isLoading}
      />
    );
  }

  // Sankey (requires specific data structure)
  if (chartType === 'sankey') {
    const nodes = customConfig.nodes || [];
    const links = customConfig.links || [];

    return <SankeyDiagram nodes={nodes} links={links} isLoading={isLoading} />;
  }

  // Fallback: Default to line chart
  return (
    <TimeSeriesChart
      series={series}
      chartType="line"
      isLoading={isLoading}
    />
  );
}
