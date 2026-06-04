/**
 * Dashboard Templates
 * Predefined dashboard layouts for common use cases
 */

import type { ChartType } from '@/lib/stores/explorer-store';

export interface WidgetTemplate {
  id: string;
  title: string;
  chartType: ChartType;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  description?: string;
  defaultMetrics?: string[];
  configuration?: Record<string, unknown>;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: 'industrial' | 'energy' | 'environmental' | 'smart-building' | 'general';
  icon: string;
  widgets: WidgetTemplate[];
  tags: string[];
}

/**
 * Predefined Dashboard Templates
 */
export const dashboardTemplates: DashboardTemplate[] = [
  {
    id: 'industrial-overview',
    name: 'Industrial Overview',
    description: 'Complete monitoring for industrial IoT sensors and equipment',
    category: 'industrial',
    icon: '🏭',
    tags: ['manufacturing', 'production', 'equipment'],
    widgets: [
      {
        id: 'temp-gauge',
        title: 'Current Temperature',
        chartType: 'gauge',
        layout: { x: 0, y: 0, w: 4, h: 3 },
        description: 'Real-time temperature gauge',
        configuration: {
          min: 0,
          max: 150,
          thresholds: [50, 100, 130],
        },
      },
      {
        id: 'pressure-line',
        title: 'Pressure Trend',
        chartType: 'line',
        layout: { x: 4, y: 0, w: 8, h: 3 },
        description: '24-hour pressure trend',
      },
      {
        id: 'vibration-heatmap',
        title: 'Vibration Heatmap',
        chartType: 'heatmap',
        layout: { x: 0, y: 3, w: 6, h: 3 },
        description: 'Equipment vibration patterns',
      },
      {
        id: 'efficiency-bar',
        title: 'Production Efficiency',
        chartType: 'bar',
        layout: { x: 6, y: 3, w: 6, h: 3 },
        description: 'Hourly production efficiency',
      },
      {
        id: 'alerts-funnel',
        title: 'Alert Pipeline',
        chartType: 'funnel',
        layout: { x: 0, y: 6, w: 4, h: 3 },
        description: 'Alert triage funnel',
      },
      {
        id: 'quality-radar',
        title: 'Quality Metrics',
        chartType: 'radar',
        layout: { x: 4, y: 6, w: 8, h: 3 },
        description: 'Multi-dimensional quality assessment',
      },
    ],
  },
  {
    id: 'energy-monitoring',
    name: 'Energy Monitoring',
    description: 'Track energy consumption, solar production, and power quality',
    category: 'energy',
    icon: '⚡',
    tags: ['energy', 'solar', 'power', 'consumption'],
    widgets: [
      {
        id: 'power-gauge',
        title: 'Current Power',
        chartType: 'gauge',
        layout: { x: 0, y: 0, w: 4, h: 3 },
        description: 'Real-time power consumption',
        configuration: {
          min: 0,
          max: 10000,
          unit: 'kW',
        },
      },
      {
        id: 'consumption-area',
        title: 'Energy Consumption',
        chartType: 'area',
        layout: { x: 4, y: 0, w: 8, h: 3 },
        description: 'Daily energy usage pattern',
      },
      {
        id: 'solar-vs-grid',
        title: 'Solar vs Grid',
        chartType: 'line',
        layout: { x: 0, y: 3, w: 6, h: 3 },
        description: 'Compare solar production with grid consumption',
      },
      {
        id: 'cost-treemap',
        title: 'Cost Breakdown',
        chartType: 'treemap',
        layout: { x: 6, y: 3, w: 6, h: 3 },
        description: 'Energy cost by department/zone',
      },
      {
        id: 'efficiency-pie',
        title: 'Source Distribution',
        chartType: 'pie',
        layout: { x: 0, y: 6, w: 4, h: 3 },
        description: 'Energy source breakdown',
      },
      {
        id: 'quality-line',
        title: 'Power Quality',
        chartType: 'line',
        layout: { x: 4, y: 6, w: 8, h: 3 },
        description: 'Voltage and frequency stability',
      },
    ],
  },
  {
    id: 'environmental-monitoring',
    name: 'Environmental Monitoring',
    description: 'Monitor air quality, temperature, humidity, and environmental conditions',
    category: 'environmental',
    icon: '🌍',
    tags: ['environment', 'air-quality', 'weather', 'climate'],
    widgets: [
      {
        id: 'aqi-gauge',
        title: 'Air Quality Index',
        chartType: 'gauge',
        layout: { x: 0, y: 0, w: 4, h: 3 },
        description: 'Current air quality',
        configuration: {
          min: 0,
          max: 500,
          thresholds: [50, 100, 150, 200, 300],
        },
      },
      {
        id: 'temp-humidity',
        title: 'Temperature & Humidity',
        chartType: 'line',
        layout: { x: 4, y: 0, w: 8, h: 3 },
        description: '24-hour temperature and humidity trends',
      },
      {
        id: 'pollutants-radar',
        title: 'Pollutant Levels',
        chartType: 'radar',
        layout: { x: 0, y: 3, w: 6, h: 3 },
        description: 'Multi-pollutant assessment',
      },
      {
        id: 'co2-area',
        title: 'CO₂ Concentration',
        chartType: 'area',
        layout: { x: 6, y: 3, w: 6, h: 3 },
        description: 'Indoor CO₂ levels over time',
      },
      {
        id: 'noise-heatmap',
        title: 'Noise Levels',
        chartType: 'heatmap',
        layout: { x: 0, y: 6, w: 6, h: 3 },
        description: 'Noise pollution heatmap',
      },
      {
        id: 'weather-scatter',
        title: 'Weather Correlation',
        chartType: 'scatter',
        layout: { x: 6, y: 6, w: 6, h: 3 },
        description: 'Temp vs humidity correlation',
      },
    ],
  },
  {
    id: 'smart-building',
    name: 'Smart Building',
    description: 'Building automation, HVAC, occupancy, and comfort monitoring',
    category: 'smart-building',
    icon: '🏢',
    tags: ['building', 'hvac', 'occupancy', 'comfort'],
    widgets: [
      {
        id: 'occupancy-gauge',
        title: 'Building Occupancy',
        chartType: 'gauge',
        layout: { x: 0, y: 0, w: 4, h: 3 },
        description: 'Current occupancy percentage',
        configuration: {
          min: 0,
          max: 100,
          unit: '%',
        },
      },
      {
        id: 'hvac-line',
        title: 'HVAC Performance',
        chartType: 'line',
        layout: { x: 4, y: 0, w: 8, h: 3 },
        description: 'Temperature setpoint vs actual',
      },
      {
        id: 'floor-heatmap',
        title: 'Floor Temperature',
        chartType: 'heatmap',
        layout: { x: 0, y: 3, w: 6, h: 3 },
        description: 'Temperature distribution by floor',
      },
      {
        id: 'energy-flow',
        title: 'Energy Flow',
        chartType: 'sankey',
        layout: { x: 6, y: 3, w: 6, h: 3 },
        description: 'Energy distribution across systems',
      },
      {
        id: 'comfort-radar',
        title: 'Comfort Index',
        chartType: 'radar',
        layout: { x: 0, y: 6, w: 6, h: 3 },
        description: 'Multi-factor comfort assessment',
      },
      {
        id: 'zones-treemap',
        title: 'Zone Utilization',
        chartType: 'treemap',
        layout: { x: 6, y: 6, w: 6, h: 3 },
        description: 'Space utilization by zone',
      },
    ],
  },
  {
    id: 'basic-monitoring',
    name: 'Basic Monitoring',
    description: 'Simple dashboard for general sensor monitoring',
    category: 'general',
    icon: '📊',
    tags: ['general', 'basic', 'starter'],
    widgets: [
      {
        id: 'metric-1',
        title: 'Primary Metric',
        chartType: 'line',
        layout: { x: 0, y: 0, w: 6, h: 3 },
        description: 'Main metric trend',
      },
      {
        id: 'metric-2',
        title: 'Secondary Metric',
        chartType: 'bar',
        layout: { x: 6, y: 0, w: 6, h: 3 },
        description: 'Secondary metric comparison',
      },
      {
        id: 'current-value',
        title: 'Current Value',
        chartType: 'gauge',
        layout: { x: 0, y: 3, w: 4, h: 3 },
        description: 'Real-time value',
      },
      {
        id: 'distribution',
        title: 'Distribution',
        chartType: 'pie',
        layout: { x: 4, y: 3, w: 4, h: 3 },
        description: 'Value distribution',
      },
      {
        id: 'stats',
        title: 'Statistics',
        chartType: 'boxplot',
        layout: { x: 8, y: 3, w: 4, h: 3 },
        description: 'Statistical overview',
      },
    ],
  },
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): DashboardTemplate | undefined {
  return dashboardTemplates.find((t) => t.id === id);
}

/**
 * Get a single template by its id (or undefined if not found).
 */
export function getDashboardTemplate(id: string): DashboardTemplate | undefined {
  return dashboardTemplates.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: DashboardTemplate['category']
): DashboardTemplate[] {
  return dashboardTemplates.filter((t) => t.category === category);
}

/**
 * Search templates by tags
 */
export function searchTemplates(query: string): DashboardTemplate[] {
  const lowerQuery = query.toLowerCase();
  return dashboardTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}
