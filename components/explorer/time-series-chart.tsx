'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { getChartToolbox, getDataZoom } from '@/lib/utils/chart-toolbox';

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

interface TimeSeriesChartProps {
  series: Series[];
  chartType: 'line' | 'bar' | 'area' | 'scatter';
  isLoading?: boolean;
}

export function TimeSeriesChart({ series, chartType, isLoading }: TimeSeriesChartProps) {
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
  }, [series, chartType]);

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
