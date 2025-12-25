'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

interface SankeyNode {
  name: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface SankeyDiagramProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  isLoading?: boolean;
}

export function SankeyDiagram({ nodes, links, isLoading }: SankeyDiagramProps) {
  const option = useMemo(() => {
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
          if (params.dataType === 'edge') {
            return `${params.data.source} → ${params.data.target}<br/>Value: ${params.data.value}`;
          }
          return params.data.name;
        },
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          emphasis: {
            focus: 'adjacency',
          },
          data: nodes,
          links: links,
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
          },
          itemStyle: {
            color: '#3b82f6',
            borderColor: '#1e40af',
            borderWidth: 1,
          },
          label: {
            color: '#e5e7eb',
            fontSize: 12,
          },
        },
      ],
    };
  }, [nodes, links]);

  if (isLoading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-muted-foreground">Loading Sankey diagram...</div>
      </div>
    );
  }

  if (nodes.length === 0 || links.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card rounded-lg border">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No data available</p>
          <p className="text-sm text-muted-foreground">
            Sankey diagrams require nodes and links data
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
