'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

interface RadarDataPoint {
  value: number[];
  name: string;
}

interface RadarIndicator {
  name: string;
  max: number;
  min?: number;
}

interface RadarChartProps {
  indicators: RadarIndicator[];
  data: RadarDataPoint[];
  isLoading?: boolean;
}

export function RadarChart({ indicators, data, isLoading }: RadarChartProps) {
  const option: EChartsOption = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      textStyle: {
        color: '#e5e7eb',
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#374151',
        textStyle: {
          color: '#e5e7eb',
        },
      },
      legend: {
        data: data.map((d) => d.name),
        textStyle: {
          color: '#e5e7eb',
        },
        top: 10,
      },
      radar: {
        indicator: indicators,
        splitNumber: 4,
        shape: 'polygon',
        name: {
          textStyle: {
            color: '#e5e7eb',
            fontSize: 12,
          },
        },
        splitLine: {
          lineStyle: {
            color: '#374151',
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: [
              'rgba(59, 130, 246, 0.05)',
              'rgba(59, 130, 246, 0.1)',
              'rgba(59, 130, 246, 0.15)',
              'rgba(59, 130, 246, 0.2)',
            ],
          },
        },
        axisLine: {
          lineStyle: {
            color: '#374151',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: data.map((item, index) => ({
            value: item.value,
            name: item.name,
            areaStyle: {
              opacity: 0.3,
            },
            itemStyle: {
              color: [
                '#3b82f6',
                '#22c55e',
                '#eab308',
                '#f97316',
                '#ef4444',
                '#a855f7',
              ][index % 6],
            },
          })),
          emphasis: {
            lineStyle: {
              width: 3,
            },
          },
        },
      ],
    };
  }, [indicators, data]);

  if (isLoading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-muted-foreground">Loading radar chart...</div>
      </div>
    );
  }

  if (indicators.length === 0 || data.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No data available</p>
          <p className="text-sm text-muted-foreground">
            Radar chart requires indicators and data points
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
