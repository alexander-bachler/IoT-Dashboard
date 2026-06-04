/**
 * Zustand store for saved Explorer views.
 *
 * A "view" is a named snapshot of the Explorer configuration (device, metrics,
 * time range, chart type, aggregation, compare mode). Persisted to localStorage
 * so users can quickly jump between recurring analyses.
 *
 * NOTE: persistence is currently client-side. A future iteration can move this
 * to a FastAPI resource (owner-scoped table) for cross-device sync; the view
 * config shape below is already serialisable to make that migration easy.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useExplorerStore, ChartType, TimeRangePreset } from './explorer-store';

export interface SavedViewConfig {
  selectedDeviceId: string | null;
  selectedMetricIds: string[];
  timeRangePreset: TimeRangePreset;
  // Stored as ISO strings so the view survives JSON serialisation.
  customTimeRange: { start: string; end: string } | null;
  chartType: ChartType;
  autoAggregate: boolean;
  aggregationInterval: string;
  autoRefresh: boolean;
  refreshInterval: number;
  compareMode: boolean;
  compareOffset: number;
}

export interface SavedView {
  id: string;
  name: string;
  createdAt: string;
  config: SavedViewConfig;
}

interface SavedViewsState {
  views: SavedView[];
  /** Snapshot the current Explorer state under the given name. */
  saveView: (name: string) => void;
  /** Apply a saved view back onto the Explorer store. */
  applyView: (id: string) => void;
  deleteView: (id: string) => void;
  renameView: (id: string, name: string) => void;
}

const snapshotConfig = (): SavedViewConfig => {
  const s = useExplorerStore.getState();
  return {
    selectedDeviceId: s.selectedDeviceId,
    selectedMetricIds: [...s.selectedMetricIds],
    timeRangePreset: s.timeRangePreset,
    customTimeRange: s.customTimeRange
      ? {
          start: s.customTimeRange.start.toISOString(),
          end: s.customTimeRange.end.toISOString(),
        }
      : null,
    chartType: s.chartType,
    autoAggregate: s.autoAggregate,
    aggregationInterval: s.aggregationInterval,
    autoRefresh: s.autoRefresh,
    refreshInterval: s.refreshInterval,
    compareMode: s.compareMode,
    compareOffset: s.compareOffset,
  };
};

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useSavedViewsStore = create<SavedViewsState>()(
  persist(
    (set, get) => ({
      views: [],

      saveView: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const view: SavedView = {
          id: newId(),
          name: trimmed,
          createdAt: new Date().toISOString(),
          config: snapshotConfig(),
        };
        set((state) => ({ views: [view, ...state.views] }));
      },

      applyView: (id) => {
        const view = get().views.find((v) => v.id === id);
        if (!view) return;
        const c = view.config;
        useExplorerStore.setState({
          selectedDeviceId: c.selectedDeviceId,
          selectedMetricIds: [...c.selectedMetricIds],
          timeRangePreset: c.timeRangePreset,
          customTimeRange: c.customTimeRange
            ? {
                start: new Date(c.customTimeRange.start),
                end: new Date(c.customTimeRange.end),
              }
            : null,
          chartType: c.chartType,
          autoAggregate: c.autoAggregate,
          aggregationInterval: c.aggregationInterval,
          autoRefresh: c.autoRefresh,
          refreshInterval: c.refreshInterval,
          compareMode: c.compareMode,
          compareOffset: c.compareOffset,
        });
      },

      deleteView: (id) =>
        set((state) => ({ views: state.views.filter((v) => v.id !== id) })),

      renameView: (id, name) =>
        set((state) => ({
          views: state.views.map((v) =>
            v.id === id ? { ...v, name: name.trim() || v.name } : v
          ),
        })),
    }),
    { name: 'explorer-saved-views' }
  )
);
