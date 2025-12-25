'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  title?: string;
  unit?: string;
  thresholds?: {
    low: number;
    medium: number;
    high: number;
  };
  isLoading?: boolean;
}

export function GaugeChart({
  value,
  min = 0,
  max = 100,
  title = 'Gauge',
  unit = '',
  thresholds,
  isLoading,
}: GaugeChartProps) {
  const option = useMemo(() => {
    // Determine color based on thresholds
    let color = '#3b82f6'; // Default blue
    if (thresholds) {
      if (value < thresholds.low) {
        color = '#22c55e'; // Green
      } else if (value < thresholds.medium) {
        color = '#eab308'; // Yellow
      } else if (value < thresholds.high) {
        color = '#f97316'; // Orange
      } else {
        color = '#ef4444'; // Red
      }
    }

    return {
      backgroundColor: 'transparent',
      textStyle: {
        color: '#e5e7eb',
      },
      series: [
        {
          type: 'gauge',
          startAngle: 200,
          endAngle: -20,
          min: min,
          max: max,
          splitNumber: 10,
          itemStyle: {
            color: color,
          },
          progress: {
            show: true,
            width: 18,
          },
          pointer: {
            show: true,
            length: '70%',
            width: 6,
          },
          axisLine: {
            lineStyle: {
              width: 18,
              color: [
                [thresholds ? thresholds.low / max : 0.3, '#22c55e'],
                [thresholds ? thresholds.medium / max : 0.6, '#eab308'],
                [thresholds ? thresholds.high / max : 0.9, '#f97316'],
                [1, '#ef4444'],
              ],
            },
          },
          axisTick: {
            distance: -22,
            length: 5,
            lineStyle: {
              color: '#e5e7eb',
              width: 1,
            },
          },
          splitLine: {
            distance: -24,
            length: 12,
            lineStyle: {
              color: '#e5e7eb',
              width: 2,
            },
          },
          axisLabel: {
            distance: 20,
            color: '#9ca3af',
            fontSize: 11,
          },
          anchor: {
            show: true,
            showAbove: true,
            size: 18,
            itemStyle: {
              borderWidth: 5,
              borderColor: color,
              color: '#1f2937',
            },
          },
          title: {
            show: true,
            offsetCenter: [0, '80%'],
            fontSize: 14,
            color: '#e5e7eb',
          },
          detail: {
            valueAnimation: true,
            fontSize: 32,
            fontWeight: 'bold',
            offsetCenter: [0, '50%'],
            formatter: (val: number) => `{value|${val.toFixed(1)}}{unit|${unit}}`,
            rich: {
              value: {
                fontSize: 40,
                fontWeight: 'bold',
                color: color,
              },
              unit: {
                fontSize: 16,
                color: '#9ca3af',
                padding: [0, 0, 0, 5],
              },
            },
          },
          data: [
            {
              value: value,
              name: title,
            },
          ],
        },
      ],
    };
  }, [value, min, max, title, unit, thresholds]);

  if (isLoading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-muted-foreground">Loading gauge...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ReactECharts
        option={option}
        style={{ height: '400px', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}
