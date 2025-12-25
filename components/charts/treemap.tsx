'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

interface TreemapDataPoint {
  name: string;
  value: number;
  children?: TreemapDataPoint[];
}

interface TreemapProps {
  data: TreemapDataPoint[];
  title?: string;
  isLoading?: boolean;
}

export function Treemap({ data, title, isLoading }: TreemapProps) {
  const option = useMemo(() => {
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
        formatter: (params: any) => {
          return `${params.name}<br/>Value: ${params.value}`;
        },
      },
      series: [
        {
          type: 'treemap',
          data: data,
          roam: false,
          nodeClick: 'zoomToNode',
          breadcrumb: {
            show: true,
            itemStyle: {
              color: '#374151',
              textStyle: {
                color: '#e5e7eb',
              },
            },
          },
          label: {
            show: true,
            formatter: '{b}',
            color: '#e5e7eb',
          },
          itemStyle: {
            borderColor: '#1f2937',
            borderWidth: 2,
            gapWidth: 2,
          },
          levels: [
            {
              itemStyle: {
                borderColor: '#1f2937',
                borderWidth: 2,
                gapWidth: 2,
              },
            },
            {
              colorSaturation: [0.35, 0.5],
              itemStyle: {
                gapWidth: 1,
                borderColorSaturation: 0.6,
              },
            },
            {
              colorSaturation: [0.35, 0.5],
              itemStyle: {
                gapWidth: 1,
                borderColorSaturation: 0.6,
              },
            },
          ],
          visualMin: 0,
          visualMax: Math.max(...data.map((d) => d.value)),
          visualDimension: 0,
          colorMappingBy: 'value',
          color: ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7'],
        },
      ],
    };
  }, [data, title]);

  if (isLoading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-muted-foreground">Loading treemap...</div>
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
