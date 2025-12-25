/**
 * Chart Configuration Utilities
 * Helpers for chart setup and data transformation
 */

import type { ChartType } from '@/lib/stores/explorer-store';

/**
 * Chart metadata and descriptions
 */
export const CHART_INFO: Record<
  ChartType,
  {
    name: string;
    description: string;
    icon: string;
    category: 'timeseries' | 'statistical' | 'distribution' | 'comparison' | 'flow';
    minMetrics: number;
    maxMetrics: number;
    bestFor: string[];
  }
> = {
  line: {
    name: 'Line Chart',
    description: 'Continuous time-series trends',
    icon: '📈',
    category: 'timeseries',
    minMetrics: 1,
    maxMetrics: 10,
    bestFor: ['Trends over time', 'Continuous data', 'Multiple series comparison'],
  },
  bar: {
    name: 'Bar Chart',
    description: 'Categorical or discrete data',
    icon: '📊',
    category: 'timeseries',
    minMetrics: 1,
    maxMetrics: 5,
    bestFor: ['Discrete intervals', 'Categorical data', 'Comparisons'],
  },
  area: {
    name: 'Area Chart',
    description: 'Filled line chart emphasizing magnitude',
    icon: '📉',
    category: 'timeseries',
    minMetrics: 1,
    maxMetrics: 5,
    bestFor: ['Cumulative trends', 'Magnitude over time', 'Volume visualization'],
  },
  scatter: {
    name: 'Scatter Plot',
    description: 'Correlation between variables',
    icon: '⚫',
    category: 'statistical',
    minMetrics: 1,
    maxMetrics: 2,
    bestFor: ['Correlations', 'Outlier detection', 'Clustering'],
  },
  heatmap: {
    name: 'Heatmap',
    description: '2D data with color intensity',
    icon: '🔥',
    category: 'statistical',
    minMetrics: 1,
    maxMetrics: 1,
    bestFor: ['Patterns over time', 'Hourly/daily patterns', 'Intensity visualization'],
  },
  gauge: {
    name: 'Gauge Chart',
    description: 'Single KPI with thresholds',
    icon: '⏲️',
    category: 'comparison',
    minMetrics: 1,
    maxMetrics: 1,
    bestFor: ['KPIs', 'Current values', 'Threshold monitoring'],
  },
  radar: {
    name: 'Radar Chart',
    description: 'Multi-dimensional comparison',
    icon: '🎯',
    category: 'comparison',
    minMetrics: 3,
    maxMetrics: 10,
    bestFor: ['Multi-metric comparison', 'Performance profiles', 'Balanced views'],
  },
  pie: {
    name: 'Pie Chart',
    description: 'Part-to-whole relationships',
    icon: '🥧',
    category: 'distribution',
    minMetrics: 2,
    maxMetrics: 8,
    bestFor: ['Proportions', 'Market share', 'Distribution'],
  },
  funnel: {
    name: 'Funnel Chart',
    description: 'Sequential stage reduction',
    icon: '🔻',
    category: 'distribution',
    minMetrics: 3,
    maxMetrics: 7,
    bestFor: ['Conversion rates', 'Process stages', 'Progressive reduction'],
  },
  treemap: {
    name: 'Treemap',
    description: 'Hierarchical nested rectangles',
    icon: '🗂️',
    category: 'distribution',
    minMetrics: 2,
    maxMetrics: 20,
    bestFor: ['Hierarchical data', 'Space utilization', 'Proportional sizes'],
  },
  boxplot: {
    name: 'Boxplot',
    description: 'Statistical distribution with quartiles',
    icon: '📦',
    category: 'statistical',
    minMetrics: 1,
    maxMetrics: 10,
    bestFor: ['Statistical analysis', 'Outliers', 'Distribution comparison'],
  },
  sankey: {
    name: 'Sankey Diagram',
    description: 'Flow between nodes',
    icon: '🌊',
    category: 'flow',
    minMetrics: 2,
    maxMetrics: 20,
    bestFor: ['Flow visualization', 'Energy flow', 'Process flow'],
  },
  sunburst: {
    name: 'Sunburst Chart',
    description: 'Hierarchical radial visualization',
    icon: '☀️',
    category: 'distribution',
    minMetrics: 2,
    maxMetrics: 20,
    bestFor: ['Hierarchical proportions', 'Multi-level data', 'Part-of-whole'],
  },
  candlestick: {
    name: 'Candlestick Chart',
    description: 'OHLC financial data',
    icon: '🕯️',
    category: 'timeseries',
    minMetrics: 4,
    maxMetrics: 4,
    bestFor: ['Financial data', 'OHLC values', 'Price movements'],
  },
};

/**
 * Get suggested chart types based on metric count
 */
export function getSuggestedChartTypes(metricCount: number): ChartType[] {
  return (Object.keys(CHART_INFO) as ChartType[]).filter(
    (type) =>
      metricCount >= CHART_INFO[type].minMetrics &&
      metricCount <= CHART_INFO[type].maxMetrics
  );
}

/**
 * Check if chart type is suitable for given metrics
 */
export function isChartTypeSuitable(chartType: ChartType, metricCount: number): boolean {
  const info = CHART_INFO[chartType];
  return metricCount >= info.minMetrics && metricCount <= info.maxMetrics;
}

/**
 * Get chart category color
 */
export function getChartCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    timeseries: '#3b82f6',
    statistical: '#22c55e',
    distribution: '#eab308',
    comparison: '#f97316',
    flow: '#a855f7',
  };
  return colors[category] || '#9ca3af';
}

/**
 * Get recommended aggregation interval based on time range
 */
export function getRecommendedAggregation(startTime: Date, endTime: Date): string {
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 6) return 'raw'; // No aggregation
  if (diffHours <= 24) return '5 minutes';
  if (diffHours <= 72) return '15 minutes';
  if (diffHours <= 168) return '1 hour'; // 1 week
  if (diffHours <= 720) return '6 hours'; // 30 days
  return '1 day';
}

/**
 * Format chart data for export
 */
export function formatChartDataForExport(
  chartType: ChartType,
  data: any
): {
  type: string;
  filename: string;
  data: any;
} {
  const timestamp = new Date().toISOString().split('T')[0];
  return {
    type: chartType,
    filename: `${chartType}-chart-${timestamp}.json`,
    data,
  };
}

/**
 * Generate color palette for charts
 */
export function generateChartColors(count: number): string[] {
  const baseColors = [
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#eab308', // Yellow
    '#f97316', // Orange
    '#ef4444', // Red
    '#a855f7', // Purple
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f59e0b', // Amber
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // Generate additional colors using HSL
  const colors = [...baseColors];
  const step = 360 / count;

  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * step) % 360;
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }

  return colors;
}

/**
 * Calculate optimal chart dimensions based on container
 */
export function calculateChartDimensions(
  containerWidth: number,
  chartType: ChartType
): {
  width: number;
  height: number;
} {
  const aspectRatios: Record<ChartType, number> = {
    line: 16 / 9,
    bar: 16 / 9,
    area: 16 / 9,
    scatter: 1,
    heatmap: 16 / 9,
    gauge: 1,
    radar: 1,
    pie: 1,
    funnel: 4 / 3,
    treemap: 16 / 9,
    boxplot: 16 / 9,
    sankey: 16 / 9,
    sunburst: 1,
    candlestick: 16 / 9,
  };

  const aspectRatio = aspectRatios[chartType] || 16 / 9;
  const height = containerWidth / aspectRatio;

  return {
    width: containerWidth,
    height: Math.max(300, Math.min(height, 800)), // Clamp between 300 and 800
  };
}
