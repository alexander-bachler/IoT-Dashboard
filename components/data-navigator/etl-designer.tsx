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
import { TransformNode } from './transform-node';
import { TransformationToolbox } from './transformation-toolbox';
import {
  Play,
  Save,
  Download,
  Upload,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const nodeTypes = {
  transform: TransformNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'transform',
    position: { x: 100, y: 100 },
    data: {
      label: 'Source: measurements',
      type: 'source',
      config: {
        table: 'measurements',
        columns: ['time', 'metric_id', 'value', 'quality'],
      },
      status: 'ready',
      rowCount: 10000000,
    },
  },
  {
    id: '2',
    type: 'transform',
    position: { x: 100, y: 250 },
    data: {
      label: 'Filter: Last 30 Days',
      type: 'filter',
      config: {
        condition: "time >= NOW() - INTERVAL '30 days'",
      },
      status: 'ready',
      rowCount: 432000,
    },
  },
  {
    id: '3',
    type: 'transform',
    position: { x: 100, y: 400 },
    data: {
      label: 'Join: metrics',
      type: 'join',
      config: {
        table: 'metrics',
        on: 'metric_id = metrics.id',
        type: 'LEFT',
      },
      status: 'ready',
      rowCount: 432000,
    },
  },
  {
    id: '4',
    type: 'transform',
    position: { x: 100, y: 550 },
    data: {
      label: 'Aggregate: Hourly Avg',
      type: 'aggregate',
      config: {
        groupBy: "time_bucket('1 hour', time), metric_id",
        aggregations: 'AVG(value) as avg_value',
      },
      status: 'ready',
      rowCount: 18000,
    },
  },
  {
    id: '5',
    type: 'transform',
    position: { x: 100, y: 700 },
    data: {
      label: 'Select Columns',
      type: 'select',
      config: {
        columns: ['time', 'metric_id', 'avg_value', 'unit'],
      },
      status: 'ready',
      rowCount: 18000,
    },
  },
  {
    id: '6',
    type: 'transform',
    position: { x: 100, y: 850 },
    data: {
      label: 'Output: hourly_averages',
      type: 'output',
      config: {
        destination: 'hourly_averages',
        mode: 'replace',
      },
      status: 'pending',
      rowCount: 18000,
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
  },
  {
    id: 'e4-5',
    source: '4',
    target: '5',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
  },
  {
    id: 'e5-6',
    source: '5',
    target: '6',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
  },
];

export function ETLDesigner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleRunPipeline = () => {
    setIsRunning(true);
    // Simulate pipeline execution
    setTimeout(() => {
      setIsRunning(false);
      alert('Pipeline erfolgreich ausgeführt! 18.000 Zeilen verarbeitet.');
    }, 2000);
  };

  const handleSavePipeline = () => {
    const pipeline = { nodes, edges };
    const blob = new Blob([JSON.stringify(pipeline, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'etl-pipeline.json';
    a.click();
  };

  const addTransformation = (type: string, label: string) => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type: 'transform',
      position: { x: 100, y: nodes.length * 150 + 100 },
      data: {
        label,
        type,
        config: {},
        status: 'pending',
        rowCount: 0,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-purple-500/10 border-purple-500/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-purple-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">ETL Pipeline Designer</h3>
            <p className="text-sm text-muted-foreground">
              Designen Sie visuelle Daten-Transformationen. Ziehen Sie Schritte aus der Toolbox und
              verbinden Sie diese zu einem Datenfluss. Ähnlich wie Power Query oder Tableau Prep.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleRunPipeline} disabled={isRunning} className="gap-2">
          <Play className="h-4 w-4" />
          {isRunning ? 'Pipeline läuft...' : 'Pipeline ausführen'}
        </Button>
        <Button onClick={handleSavePipeline} variant="outline" className="gap-2">
          <Save className="h-4 w-4" />
          Speichern
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportieren
        </Button>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importieren
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Transformation hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transformation hinzufügen</DialogTitle>
              <DialogDescription>
                Wählen Sie eine Transformationsart aus der Liste
              </DialogDescription>
            </DialogHeader>
            <TransformationToolbox onAdd={addTransformation} />
          </DialogContent>
        </Dialog>
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
                  switch (node.data.type) {
                    case 'source':
                      return '#22c55e';
                    case 'output':
                      return '#ef4444';
                    case 'filter':
                      return '#f59e0b';
                    case 'aggregate':
                      return '#8b5cf6';
                    case 'join':
                      return '#06b6d4';
                    default:
                      return '#3b82f6';
                  }
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{selectedNode.data.type}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                    setSelectedNode(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Label</div>
                  <div className="text-sm font-medium">{selectedNode.data.label}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        selectedNode.data.status === 'ready'
                          ? 'bg-green-500'
                          : selectedNode.data.status === 'running'
                            ? 'bg-yellow-500'
                            : 'bg-slate-500'
                      }`}
                    />
                    <span className="text-sm capitalize">{selectedNode.data.status}</span>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Zeilen</div>
                  <div className="text-lg font-semibold">
                    {selectedNode.data.rowCount?.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-2">Konfiguration</div>
                  <div className="space-y-2">
                    {Object.entries(selectedNode.data.config || {}).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <div className="text-muted-foreground mb-1">{key}:</div>
                        <div className="font-mono bg-slate-800 p-2 rounded">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-4 h-full flex items-center justify-center text-center">
              <div className="text-muted-foreground text-sm">
                Wählen Sie einen Schritt aus, um Details anzuzeigen
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Schritte</div>
          <div className="text-2xl font-bold">{nodes.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Verbindungen</div>
          <div className="text-2xl font-bold">{edges.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Input Zeilen</div>
          <div className="text-2xl font-bold">
            {nodes[0]?.data.rowCount?.toLocaleString() || '0'}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Output Zeilen</div>
          <div className="text-2xl font-bold">
            {nodes[nodes.length - 1]?.data.rowCount?.toLocaleString() || '0'}
          </div>
        </Card>
      </div>
    </div>
  );
}
