'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

interface FunnelDataPoint {
  value: number;
  name: string;
}

interface FunnelChartProps {
  data: FunnelDataPoint[];
  title?: string;
  sort?: 'descending' | 'ascending' | 'none';
  isLoading?: boolean;
}

export function FunnelChart({ data, title, sort = 'descending', isLoading }: FunnelChartProps) {
  const option = useMemo(() => {
    const colors = [
      '#3b82f6',
      '#22c55e',
      '#eab308',
      '#f97316',
      '#ef4444',
      '#a855f7',
    ];

    return {
      backgroundColor: 'transparent',
      textStyle: {
        color: '#e5e7eb',
      },
      title: title
        ? {
            text: title,
            left: 'center',
            textStyle: {
              color: '#e5e7eb',
              fontSize: 18,
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
        left: 'left',
        textStyle: {
          color: '#e5e7eb',
        },
      },
      series: [
        {
          type: 'funnel',
          left: '20%',
          width: '60%',
          top: '15%',
          bottom: '15%',
          sort: sort,
          gap: 2,
          label: {
            show: true,
            position: 'inside',
            color: '#fff',
            fontSize: 14,
          },
          labelLine: {
            length: 10,
            lineStyle: {
              width: 1,
              type: 'solid',
            },
          },
          itemStyle: {
            borderColor: '#1f2937',
            borderWidth: 2,
          },
          emphasis: {
            label: {
              fontSize: 16,
              fontWeight: 'bold',
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
  }, [data, title, sort]);

  if (isLoading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-muted-foreground">Loading funnel chart...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
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
        style={{ height: '500px', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}
