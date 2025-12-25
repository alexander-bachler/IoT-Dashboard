'use client';

import { useCallback, useState } from 'react';
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
import { Info, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

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

export function SchemaViewer() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-blue-500/10 border-blue-500/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Schema-Übersicht</h3>
            <p className="text-sm text-muted-foreground">
              Visualisierung der Datenbankstruktur und Beziehungen. Klicken Sie auf eine Tabelle für Details.
              Blaue Linien zeigen Standard-Beziehungen, rote Linien zeigen Anomalie-Referenzen.
            </p>
          </div>
        </div>
      </Card>

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
              <h3 className="font-semibold mb-4">{selectedNode.data.label}</h3>

              {selectedNode.data.isHypertable && (
                <div className="mb-3 px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs">
                  TimescaleDB Hypertable
                </div>
              )}

              <div className="mb-4">
                <div className="text-sm text-muted-foreground mb-1">Einträge (ca.)</div>
                <div className="text-lg font-semibold">{selectedNode.data.recordCount}</div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-semibold mb-2">Spalten:</div>
                {selectedNode.data.columns.map((col: any, idx: number) => (
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
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Tabellen gesamt</div>
          <div className="text-2xl font-bold">{nodes.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Beziehungen</div>
          <div className="text-2xl font-bold">{edges.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Hypertables</div>
          <div className="text-2xl font-bold">
            {nodes.filter((n) => n.data.isHypertable).length}
          </div>
        </Card>
      </div>
    </div>
  );
}
