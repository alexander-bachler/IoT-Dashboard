/**
 * Zustand Store for Data Explorer
 * Manages state for device selection, metrics, time range, and chart configuration
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ChartType =
  | 'line'
  | 'bar'
  | 'area'
  | 'scatter'
  | 'heatmap'
  | 'gauge'
  | 'radar'
  | 'sankey'
  | 'treemap'
  | 'sunburst'
  | 'boxplot'
  | 'candlestick'
  | 'pie'
  | 'funnel';

export type TimeRangePreset = 'last_hour' | 'last_24h' | 'last_7d' | 'last_30d' | 'custom';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ExplorerState {
  // Selected device
  selectedDeviceId: string | null;
  setSelectedDeviceId: (deviceId: string | null) => void;

  // Selected metrics (multi-select)
  selectedMetricIds: string[];
  setSelectedMetricIds: (metricIds: string[]) => void;
  addMetric: (metricId: string) => void;
  removeMetric: (metricId: string) => void;

  // Time range
  timeRangePreset: TimeRangePreset;
  customTimeRange: TimeRange | null;
  setTimeRangePreset: (preset: TimeRangePreset) => void;
  setCustomTimeRange: (range: TimeRange) => void;

  // Get effective time range based on preset or custom
  getTimeRange: () => TimeRange;

  // Chart configuration
  chartType: ChartType;
  setChartType: (type: ChartType) => void;

  // Aggregation
  autoAggregate: boolean;
  setAutoAggregate: (enabled: boolean) => void;
  aggregationInterval: string; // e.g., '15 minutes', '1 hour'
  setAggregationInterval: (interval: string) => void;

  // Real-time refresh
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  refreshInterval: number; // in seconds
  setRefreshInterval: (interval: number) => void;

  // Compare mode
  compareMode: boolean;
  setCompareMode: (enabled: boolean) => void;
  compareOffset: number; // in hours, e.g., -168 for "previous week"
  setCompareOffset: (hours: number) => void;

  // Reset state
  reset: () => void;
}

const getTimeRangeFromPreset = (preset: TimeRangePreset): TimeRange => {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case 'last_hour':
      start.setHours(start.getHours() - 1);
      break;
    case 'last_24h':
      start.setDate(start.getDate() - 1);
      break;
    case 'last_7d':
      start.setDate(start.getDate() - 7);
      break;
    case 'last_30d':
      start.setDate(start.getDate() - 30);
      break;
    default:
      start.setHours(start.getHours() - 24);
  }

  return { start, end };
};

export const useExplorerStore = create<ExplorerState>()(
  persist(
    (set, get) => ({
      selectedDeviceId: null,
      setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),

      selectedMetricIds: [],
      setSelectedMetricIds: (metricIds) => set({ selectedMetricIds: metricIds }),
      addMetric: (metricId) =>
        set((state) => ({
          selectedMetricIds: [...state.selectedMetricIds, metricId],
        })),
      removeMetric: (metricId) =>
        set((state) => ({
          selectedMetricIds: state.selectedMetricIds.filter((id) => id !== metricId),
        })),

      timeRangePreset: 'last_24h',
      customTimeRange: null,
      setTimeRangePreset: (preset) => set({ timeRangePreset: preset }),
      setCustomTimeRange: (range) =>
        set({ customTimeRange: range, timeRangePreset: 'custom' }),

      getTimeRange: () => {
        const state = get();
        if (state.timeRangePreset === 'custom' && state.customTimeRange) {
          return state.customTimeRange;
        }
        return getTimeRangeFromPreset(state.timeRangePreset);
      },

      chartType: 'line',
      setChartType: (type) => set({ chartType: type }),

      autoAggregate: true,
      setAutoAggregate: (enabled) => set({ autoAggregate: enabled }),
      aggregationInterval: '15 minutes',
      setAggregationInterval: (interval) => set({ aggregationInterval: interval }),

      autoRefresh: false,
      setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),
      refreshInterval: 30, // default 30 seconds
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),

      compareMode: false,
      setCompareMode: (enabled) => set({ compareMode: enabled }),
      compareOffset: -168, // default: previous week (-168 hours)
      setCompareOffset: (hours) => set({ compareOffset: hours }),

      reset: () =>
        set({
          selectedDeviceId: null,
          selectedMetricIds: [],
          timeRangePreset: 'last_24h',
          customTimeRange: null,
          chartType: 'line',
          autoAggregate: true,
          aggregationInterval: '15 minutes',
          autoRefresh: false,
          refreshInterval: 30,
          compareMode: false,
          compareOffset: -168,
        }),
    }),
    {
      name: 'explorer-store',
      partialize: (state) => ({
        chartType: state.chartType,
        autoAggregate: state.autoAggregate,
        aggregationInterval: state.aggregationInterval,
        timeRangePreset: state.timeRangePreset,
        autoRefresh: state.autoRefresh,
        refreshInterval: state.refreshInterval,
        compareMode: state.compareMode,
        compareOffset: state.compareOffset,
      }),
    }
  )
);
