'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';

interface BoxplotDataPoint {
  name: string;
  data: number[];
}

interface BoxplotProps {
  data: BoxplotDataPoint[];
  isLoading?: boolean;
}

export function Boxplot({ data, isLoading }: BoxplotProps) {
  const option: EChartsOption = useMemo(() => {
    // Transform data for boxplot
    const categories = data.map((d) => d.name);
    const rawData = data.map((d) => d.data);

    // Calculate boxplot statistics
    const boxplotData = echarts.dataTool.prepareBoxplotData(rawData);

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
        formatter: (params: any) => {
          if (params.componentSubType === 'boxplot') {
            const [min, q1, median, q3, max] = params.value;
            return `
              ${params.name}<br/>
              Max: ${max.toFixed(2)}<br/>
              Q3: ${q3.toFixed(2)}<br/>
              Median: ${median.toFixed(2)}<br/>
              Q1: ${q1.toFixed(2)}<br/>
              Min: ${min.toFixed(2)}
            `;
          }
          return `${params.name}: ${params.value}`;
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        boundaryGap: true,
        nameGap: 30,
        splitLine: {
          show: false,
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
        type: 'value',
        name: 'Value',
        splitLine: {
          lineStyle: {
            color: '#1f2937',
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
      series: [
        {
          name: 'boxplot',
          type: 'boxplot',
          data: boxplotData.boxData,
          itemStyle: {
            color: '#3b82f6',
            borderColor: '#1e40af',
          },
          emphasis: {
            itemStyle: {
              borderColor: '#60a5fa',
              borderWidth: 2,
            },
          },
        },
        {
          name: 'outlier',
          type: 'scatter',
          data: boxplotData.outliers,
          itemStyle: {
            color: '#ef4444',
          },
          symbolSize: 6,
        },
      ],
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-muted-foreground">Loading boxplot...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No data available</p>
          <p className="text-sm text-muted-foreground">
            Boxplot requires multiple data points per category
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
