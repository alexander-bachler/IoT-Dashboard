'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

interface PieDataPoint {
  value: number;
  name: string;
}

interface PieChartProps {
  data: PieDataPoint[];
  title?: string;
  subtext?: string;
  radius?: string | string[];
  isDonut?: boolean;
  isLoading?: boolean;
}

export function PieChart({
  data,
  title,
  subtext,
  radius = '60%',
  isDonut = false,
  isLoading,
}: PieChartProps) {
  const option = useMemo(() => {
    const colors = [
      '#3b82f6',
      '#22c55e',
      '#eab308',
      '#f97316',
      '#ef4444',
      '#a855f7',
      '#06b6d4',
      '#ec4899',
    ];

    return {
      backgroundColor: 'transparent',
      textStyle: {
        color: '#e5e7eb',
      },
      title: title
        ? {
            text: title,
            subtext: subtext,
            left: 'center',
            textStyle: {
              color: '#e5e7eb',
              fontSize: 18,
            },
            subtextStyle: {
              color: '#9ca3af',
            },
          }
        : undefined,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#374151',
        textStyle: {
          color: '#e5e7eb',
        },
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: '10',
        top: 'center',
        textStyle: {
          color: '#e5e7eb',
        },
      },
      series: [
        {
          type: 'pie',
          radius: isDonut ? ['40%', '70%'] : radius,
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#1f2937',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}: {d}%',
            color: '#e5e7eb',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          labelLine: {
            show: true,
            lineStyle: {
              color: '#9ca3af',
            },
          },
          data: data.map((item, index) => ({
            ...item,
            itemStyle: {
              color: colors[index % colors.length],
            },
          })),
        },
      ],
    };
  }, [data, title, subtext, radius, isDonut]);

  if (isLoading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-muted-foreground">Loading pie chart...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No data available</p>
        </div>
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
