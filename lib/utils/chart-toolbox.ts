import type { EChartsOption } from 'echarts';

/**
 * Standard toolbox configuration for all charts
 * Includes: Download as PNG, Data Zoom, Restore
 */
export function getChartToolbox(chartName?: string): EChartsOption['toolbox'] {
  return {
    feature: {
      saveAsImage: {
        title: 'Download as PNG',
        name: chartName || `iot-chart-${new Date().toISOString().split('T')[0]}`,
        backgroundColor: '#030712',
        pixelRatio: 2,
      },
      dataZoom: {
        title: {
          zoom: 'Zoom',
          back: 'Reset Zoom',
        },
        yAxisIndex: false,
      },
      restore: {
        title: 'Restore',
      },
    },
    iconStyle: {
      borderColor: '#9ca3af',
    },
    emphasis: {
      iconStyle: {
        borderColor: '#e5e7eb',
      },
    },
    top: 10,
    right: 20,
  };
}

/**
 * Standard dataZoom configuration for time-series charts
 */
export function getDataZoom(): EChartsOption['dataZoom'] {
  return [
    {
      type: 'inside',
      start: 0,
      end: 100,
    },
    {
      type: 'slider',
      start: 0,
      end: 100,
      backgroundColor: '#1f2937',
      fillerColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: '#374151',
      textStyle: {
        color: '#9ca3af',
      },
    },
  ];
}
