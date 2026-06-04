/**
 * Zustand Store for Dashboard Builder
 * Manages dashboard layouts and widget configurations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Layout } from 'react-grid-layout';

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

export interface WidgetConfig {
  id: string;
  title: string;
  chartType: ChartType;
  deviceId: string;
  metricIds: string[];
  timeRange: {
    type: 'relative' | 'absolute';
    value: string; // e.g., 'last_24h' or ISO timestamp
  };
  aggregationInterval?: string;
  refreshInterval?: number; // in seconds
}

export interface DashboardState {
  // Current dashboard
  currentDashboardId: string | null;
  setCurrentDashboardId: (id: string | null) => void;

  // Layout
  layout: Layout[];
  setLayout: (layout: Layout[]) => void;

  // Widgets
  widgets: WidgetConfig[];
  addWidget: (widget: WidgetConfig, position?: Layout) => void;
  updateWidget: (id: string, updates: Partial<WidgetConfig>) => void;
  removeWidget: (id: string) => void;

  // Edit mode
  isEditMode: boolean;
  setEditMode: (enabled: boolean) => void;

  // Data Source Filter
  selectedDataSourceIds: string[];
  setSelectedDataSourceIds: (ids: string[]) => void;

  // Global dashboard time range. When set, every widget uses it instead of its
  // own time range; null means each widget keeps its individual range.
  globalTimeRange: string | null;
  setGlobalTimeRange: (value: string | null) => void;

  // Reset
  reset: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      currentDashboardId: null,
      setCurrentDashboardId: (id) => set({ currentDashboardId: id }),

      layout: [],
      setLayout: (layout) => set({ layout }),

      widgets: [],
      addWidget: (widget, position) => {
        const state = get();

        // Default position if not provided
        const defaultPosition: Layout = position || {
          i: widget.id,
          x: 0,
          y: Infinity, // Add to bottom
          w: 6,
          h: 4,
          minW: 3,
          minH: 3,
        };

        set({
          widgets: [...state.widgets, widget],
          layout: [...state.layout, defaultPosition],
        });
      },

      updateWidget: (id, updates) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        })),

      removeWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== id),
          layout: state.layout.filter((l) => l.i !== id),
        })),

      isEditMode: false,
      setEditMode: (enabled) => set({ isEditMode: enabled }),

      selectedDataSourceIds: [],
      setSelectedDataSourceIds: (ids) => set({ selectedDataSourceIds: ids }),

      globalTimeRange: null,
      setGlobalTimeRange: (value) => set({ globalTimeRange: value }),

      reset: () =>
        set({
          currentDashboardId: null,
          layout: [],
          widgets: [],
          isEditMode: false,
          selectedDataSourceIds: [],
          globalTimeRange: null,
        }),
    }),
    {
      name: 'dashboard-store',
    }
  )
);
