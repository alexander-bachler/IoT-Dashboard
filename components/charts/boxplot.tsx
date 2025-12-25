'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

interface BoxplotDataPoint {
  name: string;
  data: number[];
}

interface BoxplotProps {
  data: BoxplotDataPoint[];
  isLoading?: boolean;
}

/**
 * Calculate boxplot statistics for a single dataset
 */
function calculateBoxplotStats(data: number[]): [number, number, number, number, number] {
  if (data.length === 0) return [0, 0, 0, 0, 0];
  
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  
  const min = sorted[0];
  const max = sorted[n - 1];
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
    : sorted[Math.floor(n / 2)];
  
  const q1Index = Math.floor(n / 4);
  const q3Index = Math.floor(3 * n / 4);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  
  return [min, q1, median, q3, max];
}

/**
 * Find outliers using IQR method
 */
function findOutliers(data: number[], categoryIndex: number): [number, number][] {
  if (data.length === 0) return [];
  
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  
  const q1Index = Math.floor(n / 4);
  const q3Index = Math.floor(3 * n / 4);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return data
    .filter(val => val < lowerBound || val > upperBound)
    .map(val => [categoryIndex, val]);
}

/**
 * Prepare boxplot data from raw data arrays
 */
function prepareBoxplotData(rawData: number[][]) {
  const boxData = rawData.map(calculateBoxplotStats);
  const outliers = rawData.flatMap((data, index) => findOutliers(data, index));
  return { boxData, outliers };
}

export function Boxplot({ data, isLoading }: BoxplotProps) {
  const option = useMemo(() => {
    // Transform data for boxplot
    const categories = data.map((d) => d.name);
    const rawData = data.map((d) => d.data);

    // Calculate boxplot statistics
    const boxplotData = prepareBoxplotData(rawData);

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
