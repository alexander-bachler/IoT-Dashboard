'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

interface HeatmapDataPoint {
  x: number | string;
  y: number | string;
  value: number;
}

interface HeatmapProps {
  data: HeatmapDataPoint[];
  xAxisLabels?: string[];
  yAxisLabels?: string[];
  isLoading?: boolean;
}

export function Heatmap({ data, xAxisLabels, yAxisLabels, isLoading }: HeatmapProps) {
  const option: EChartsOption = useMemo(() => {
    // Transform data to ECharts format: [x, y, value]
    const heatmapData = data.map((d) => [d.x, d.y, d.value]);

    // Find min/max for color scale
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      backgroundColor: 'transparent',
      textStyle: {
        color: '#e5e7eb',
      },
      tooltip: {
        position: 'top',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#374151',
        textStyle: {
          color: '#e5e7eb',
        },
        formatter: (params: any) => {
          const [x, y, value] = params.value;
          return `X: ${xAxisLabels?.[x as number] || x}<br/>Y: ${
            yAxisLabels?.[y as number] || y
          }<br/>Value: ${value.toFixed(2)}`;
        },
      },
      grid: {
        left: '3%',
        right: '10%',
        bottom: '10%',
        top: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xAxisLabels,
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(255,255,255,0.02)', 'rgba(0,0,0,0.02)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: '#374151',
          },
        },
        axisLabel: {
          color: '#9ca3af',
        },
      },
      yAxis: {
        type: 'category',
        data: yAxisLabels,
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(255,255,255,0.02)', 'rgba(0,0,0,0.02)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: '#374151',
          },
        },
        axisLabel: {
          color: '#9ca3af',
        },
      },
      visualMap: {
        min: min,
        max: max,
        calculable: true,
        orient: 'vertical',
        right: '0',
        top: 'center',
        inRange: {
          color: ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
        },
        textStyle: {
          color: '#e5e7eb',
        },
      },
      series: [
        {
          name: 'Heatmap',
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }, [data, xAxisLabels, yAxisLabels]);

  if (isLoading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-muted-foreground">Loading heatmap...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No data available</p>
          <p className="text-sm text-muted-foreground">
            Heatmap requires 2D data points
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
