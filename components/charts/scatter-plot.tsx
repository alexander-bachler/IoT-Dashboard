'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

interface DataPoint {
  time: string;
  value: number;
  [key: string]: unknown;
}

interface Series {
  metricId: string;
  metricName: string;
  metricUnit?: string;
  data: DataPoint[];
}

interface ScatterPlotProps {
  series: Series[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  isLoading?: boolean;
}

export function ScatterPlot({ series, xAxisLabel, yAxisLabel, isLoading }: ScatterPlotProps) {
  const option: EChartsOption = useMemo(() => {
    // For scatter plot, we need x,y pairs
    // If we have 2 metrics, use them as x,y
    // Otherwise, use time as x-axis and value as y-axis

    const scatterData = series.length >= 2
      ? series[0].data.map((d, i) => ({
          value: [
            series[0].data[i]?.value || 0,
            series[1].data[i]?.value || 0,
          ],
          time: d.time,
        }))
      : series[0]?.data.map((d) => ({
          value: [new Date(d.time).getTime(), d.value],
          time: d.time,
        })) || [];

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
          const [x, y] = params.value;
          return `
            <strong>${params.seriesName}</strong><br/>
            ${xAxisLabel || 'X'}: ${typeof x === 'number' ? x.toFixed(2) : x}<br/>
            ${yAxisLabel || 'Y'}: ${y.toFixed(2)}
          `;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: series.length >= 2 ? 'value' : 'time',
        name: xAxisLabel || (series.length >= 2 ? series[0]?.metricName : 'Time'),
        nameLocation: 'middle',
        nameGap: 30,
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
      yAxis: {
        type: 'value',
        name: yAxisLabel || (series.length >= 2 ? series[1]?.metricName : series[0]?.metricName),
        nameLocation: 'middle',
        nameGap: 50,
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
      series: [
        {
          name: series.length >= 2 ? `${series[0].metricName} vs ${series[1].metricName}` : series[0]?.metricName,
          type: 'scatter',
          data: scatterData,
          symbolSize: 8,
          itemStyle: {
            color: '#3b82f6',
            opacity: 0.7,
          },
          emphasis: {
            itemStyle: {
              color: '#60a5fa',
              opacity: 1,
              borderColor: '#fff',
              borderWidth: 2,
            },
          },
        },
      ],
      dataZoom: [
        {
          type: 'inside',
        },
        {
          type: 'slider',
          backgroundColor: '#1f2937',
          fillerColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#374151',
          textStyle: {
            color: '#9ca3af',
          },
        },
      ],
    };
  }, [series, xAxisLabel, yAxisLabel]);

  if (isLoading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-muted-foreground">Loading scatter plot...</div>
      </div>
    );
  }

  if (series.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No data available</p>
          <p className="text-sm text-muted-foreground">
            Select metrics to visualize scatter plot
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
