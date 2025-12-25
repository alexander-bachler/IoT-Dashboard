'use client';

import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TableNode } from './table-node';
import { Info, ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const nodeTypes = {
  table: TableNode,
};

// Define database schema as nodes
const initialNodes: Node[] = [
  {
    id: 'data_sources',
    type: 'table',
    position: { x: 100, y: 100 },
    data: {
      label: 'data_sources',
      columns: [
        { name: 'id', type: 'UUID', isPrimary: true },
        { name: 'name', type: 'TEXT', isRequired: true },
        { name: 'type', type: 'TEXT', isRequired: true },
        { name: 'api_url', type: 'TEXT' },
        { name: 'api_token', type: 'TEXT' },
        { name: 'created_at', type: 'TIMESTAMP' },
      ],
      recordCount: '~10',
    },
  },
  {
    id: 'devices',
    type: 'table',
    position: { x: 100, y: 400 },
    data: {
      label: 'devices',
      columns: [
        { name: 'id', type: 'UUID', isPrimary: true },
        { name: 'source_id', type: 'UUID', isForeign: true },
        { name: 'external_id', type: 'TEXT', isRequired: true },
        { name: 'name', type: 'TEXT', isRequired: true },
        { name: 'description', type: 'TEXT' },
        { name: 'location', type: 'TEXT' },
        { name: 'created_at', type: 'TIMESTAMP' },
      ],
      recordCount: '~150',
    },
  },
  {
    id: 'metrics',
    type: 'table',
    position: { x: 500, y: 400 },
    data: {
      label: 'metrics',
      columns: [
        { name: 'id', type: 'UUID', isPrimary: true },
        { name: 'device_id', type: 'UUID', isForeign: true },
        { name: 'external_id', type: 'TEXT', isRequired: true },
        { name: 'name', type: 'TEXT', isRequired: true },
        { name: 'unit', type: 'TEXT' },
        { name: 'data_type', type: 'TEXT' },
        { name: 'created_at', type: 'TIMESTAMP' },
      ],
      recordCount: '~500',
    },
  },
  {
    id: 'measurements',
    type: 'table',
    position: { x: 500, y: 700 },
    data: {
      label: 'measurements',
      columns: [
        { name: 'time', type: 'TIMESTAMPTZ', isPrimary: true },
        { name: 'metric_id', type: 'UUID', isPrimary: true, isForeign: true },
        { name: 'value', type: 'DOUBLE', isRequired: true },
        { name: 'quality', type: 'INTEGER' },
      ],
      recordCount: '~10M',
      isHypertable: true,
    },
  },
  {
    id: 'anomalies',
    type: 'table',
    position: { x: 900, y: 500 },
    data: {
      label: 'anomalies',
      columns: [
        { name: 'id', type: 'UUID', isPrimary: true },
        { name: 'metric_id', type: 'UUID', isForeign: true },
        { name: 'device_id', type: 'UUID', isForeign: true },
        { name: 'timestamp', type: 'TIMESTAMPTZ' },
        { name: 'value', type: 'DOUBLE' },
        { name: 'z_score', type: 'DOUBLE' },
        { name: 'severity', type: 'TEXT' },
      ],
      recordCount: '~2K',
    },
  },
  {
    id: 'dashboards',
    type: 'table',
    position: { x: 100, y: 800 },
    data: {
      label: 'dashboards',
      columns: [
        { name: 'id', type: 'UUID', isPrimary: true },
        { name: 'name', type: 'TEXT', isRequired: true },
        { name: 'description', type: 'TEXT' },
        { name: 'layout', type: 'JSONB' },
        { name: 'created_at', type: 'TIMESTAMP' },
      ],
      recordCount: '~25',
    },
  },
];

// Define relationships as edges
const initialEdges: Edge[] = [
  {
    id: 'e-datasource-device',
    source: 'data_sources',
    target: 'devices',
    sourceHandle: 'id',
    targetHandle: 'source_id',
    label: '1:N',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6' },
  },
  {
    id: 'e-device-metric',
    source: 'devices',
    target: 'metrics',
    sourceHandle: 'id',
    targetHandle: 'device_id',
    label: '1:N',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6' },
  },
  {
    id: 'e-metric-measurement',
    source: 'metrics',
    target: 'measurements',
    sourceHandle: 'id',
    targetHandle: 'metric_id',
    label: '1:N',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6' },
  },
  {
    id: 'e-metric-anomaly',
    source: 'metrics',
    target: 'anomalies',
    sourceHandle: 'id',
    targetHandle: 'metric_id',
    label: '1:N',
    type: 'smoothstep',
    style: { stroke: '#ef4444' },
  },
  {
    id: 'e-device-anomaly',
    source: 'devices',
    target: 'anomalies',
    sourceHandle: 'id',
    targetHandle: 'device_id',
    label: '1:N',
    type: 'smoothstep',
    style: { stroke: '#ef4444' },
  },
];

interface TableNodeData {
  label: string;
  columns: Array<{ name: string; type: string; isPrimary?: boolean; isRequired?: boolean; isForeign?: boolean }>;
  recordCount: string;
  isHypertable?: boolean;
}

export function SchemaViewer() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper to get typed data from node
  const getNodeData = (node: Node): TableNodeData => node.data as unknown as TableNodeData;

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Load dynamic schema from backend
  const loadSchema = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/schema/nodes');
      if (!response.ok) {
        throw new Error('Failed to load schema');
      }
      const data = await response.json();

      setNodes(data.nodes);
      setEdges(data.edges);
      toast.success(`Schema loaded: ${data.data_source_count} data sources found`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load schema');
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  // Load schema on mount
  useEffect(() => {
    loadSchema();
  }, [loadSchema]);

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="info-banner flex-1 mr-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Schema-Übersicht</h3>
              <p className="text-sm text-muted-foreground">
                Visualisierung der Datenbankstruktur und Beziehungen. Grüne Linien = Data Sources, Blaue Linien = Beziehungen, Rote Linien = Anomalien.
              </p>
            </div>
          </div>
        </div>
        <Button onClick={loadSchema} disabled={loading} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <Card className="h-[700px] relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-slate-950"
            >
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  if (node.data.isHypertable) return '#8b5cf6';
                  return '#3b82f6';
                }}
                className="bg-slate-900"
              />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
          </Card>
        </div>

        <div className="lg:col-span-1">
          {selectedNode ? (
            <Card className="p-4">
              <h3 className="font-semibold mb-4">{getNodeData(selectedNode).label}</h3>

              {getNodeData(selectedNode).isHypertable && (
                <div className="mb-3 px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs">
                  TimescaleDB Hypertable
                </div>
              )}

              <div className="mb-4">
                <div className="text-sm text-muted-foreground mb-1">Einträge (ca.)</div>
                <div className="text-lg font-semibold">{getNodeData(selectedNode).recordCount}</div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-semibold mb-2">Spalten:</div>
                {getNodeData(selectedNode).columns.map((col, idx) => (
                  <div
                    key={idx}
                    className="text-xs p-2 bg-slate-800 rounded flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{col.name}</span>
                      {col.isPrimary && (
                        <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px]">
                          PK
                        </span>
                      )}
                      {col.isForeign && (
                        <span className="px-1 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">
                          FK
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground font-mono">{col.type}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-4 h-full flex items-center justify-center text-center">
              <div className="text-muted-foreground text-sm">
                Wählen Sie eine Tabelle aus, um Details anzuzeigen
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card group hover-scale">
          <div className="text-sm text-muted-foreground mb-1">Tabellen gesamt</div>
          <div className="text-3xl font-bold gradient-text">{nodes.length}</div>
        </div>
        <div className="metric-card group hover-scale">
          <div className="text-sm text-muted-foreground mb-1">Beziehungen</div>
          <div className="text-3xl font-bold gradient-text">{edges.length}</div>
        </div>
        <div className="metric-card group hover-scale">
          <div className="text-sm text-muted-foreground mb-1">Hypertables</div>
          <div className="text-3xl font-bold gradient-text">
            {nodes.filter((n) => n.data.isHypertable).length}
          </div>
        </div>
      </div>
    </div>
  );
}
