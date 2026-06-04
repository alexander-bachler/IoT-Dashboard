'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo, useEffect, useState } from 'react';
import { getChartToolbox, getDataZoom } from '@/lib/utils/chart-toolbox';
import apiClient from '@/lib/api/client';

interface Annotation {
  id: string;
  title: string;
  timestamp: string;
  endTimestamp?: string;
  type: string;
  severity?: string;
  color?: string;
}

interface DataPoint {
  time: string;
  value: number;
  min?: number;
  max?: number;
}

interface Series {
  metricId: string;
  metricName: string;
  metricUnit?: string;
  data: DataPoint[];
}

interface ChartWithAnnotationsProps {
  series: Series[];
  chartType: 'line' | 'bar' | 'area' | 'scatter';
  isLoading?: boolean;
  showAnnotations?: boolean;
  timeRange?: { start: Date; end: Date };
}

export function ChartWithAnnotations({
  series,
  chartType,
  isLoading,
  showAnnotations = true,
  timeRange,
}: ChartWithAnnotationsProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  useEffect(() => {
    if (!showAnnotations || !timeRange) return;

    const fetchAnnotations = async () => {
      try {
        const response = await apiClient.get<any[]>('/api/v1/annotations', {
          params: {
            start_time: timeRange.start.toISOString(),
            end_time: timeRange.end.toISOString(),
          },
        });
        const data = (response.data || []).map((a: any) => ({
          ...a,
          endTimestamp: a.endTimestamp ?? a.end_timestamp,
        }));
        setAnnotations(data);
      } catch (error) {
        console.error('Error fetching annotations:', error);
      }
    };

    fetchAnnotations();
  }, [showAnnotations, timeRange]);

  const option = useMemo(() => {
    const seriesData = series.map((s) => {
      const baseConfig = {
        name: s.metricName,
        type: chartType === 'area' ? 'line' : chartType,
        data: s.data.map((d) => [d.time, d.value]),
        smooth: chartType === 'line' || chartType === 'area',
        areaStyle: chartType === 'area' ? {} : undefined,
        emphasis: {
          focus: 'series' as const,
        },
      };

      return baseConfig;
    });

    // Create mark lines for annotations
    const markLines = annotations.map((annotation) => ({
      name: annotation.title,
      xAxis: annotation.timestamp,
      label: {
        show: true,
        formatter: annotation.title,
        position: 'insideEndTop',
        color: '#fff',
        backgroundColor: annotation.color || '#3b82f6',
        padding: [4, 8],
        borderRadius: 4,
      },
      lineStyle: {
        color: annotation.color || '#3b82f6',
        width: 2,
        type: annotation.severity === 'critical' ? 'solid' : 'dashed',
      },
    }));

    // Create mark areas for range annotations
    const markAreas = annotations
      .filter((a) => a.endTimestamp)
      .map((annotation) => [
        {
          name: annotation.title,
          xAxis: annotation.timestamp,
        },
        {
          xAxis: annotation.endTimestamp,
        },
      ]);

    // Add annotations to first series
    if (seriesData.length > 0 && annotations.length > 0) {
      seriesData[0] = {
        ...seriesData[0],
        markLine: {
          silent: false,
          symbol: ['none', 'none'],
          data: markLines,
        },
        markArea: markAreas.length > 0 ? {
          silent: false,
          itemStyle: {
            color: 'rgba(59, 130, 246, 0.1)',
          },
          data: markAreas,
          label: {
            show: true,
            position: 'top',
          },
        } : undefined,
      } as any;
    }

    return {
      backgroundColor: 'transparent',
      textStyle: {
        color: '#e5e7eb',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#374151',
        textStyle: {
          color: '#e5e7eb',
        },
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#374151',
          },
        },
      },
      legend: {
        data: series.map((s) => s.metricName),
        textStyle: {
          color: '#e5e7eb',
        },
        top: 10,
      },
      toolbox: getChartToolbox('time-series-chart'),
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        boundaryGap: chartType === 'bar',
        axisLine: {
          lineStyle: {
            color: '#374151',
          },
        },
        axisLabel: {
          color: '#9ca3af',
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#1f2937',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: series.length === 1 ? series[0].metricUnit : undefined,
        axisLine: {
          lineStyle: {
            color: '#374151',
          },
        },
        axisLabel: {
          color: '#9ca3af',
        },
        splitLine: {
          lineStyle: {
            color: '#1f2937',
          },
        },
      },
      series: seriesData,
      dataZoom: getDataZoom(),
    };
  }, [series, chartType, annotations]);

  if (isLoading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-muted-foreground">Loading chart data...</div>
      </div>
    );
  }

  if (series.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No data available</p>
          <p className="text-sm text-muted-foreground">
            Select a device and metrics to visualize data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ReactECharts
        option={option}
        style={{ height: '500px', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}
