import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Database, Key, Link } from 'lucide-react';

interface TableNodeData {
  label: string;
  columns: Array<{ name: string; type: string; isPrimary?: boolean; isForeign?: boolean }>;
  recordCount: string;
  isHypertable?: boolean;
}

export const TableNode = memo(({ data: rawData }: NodeProps) => {
  const data = rawData as unknown as TableNodeData;
  return (
    <div className="bg-slate-900 border-2 border-slate-700 rounded-lg shadow-xl min-w-[250px] hover:border-blue-500 transition-colors">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 rounded-t-lg flex items-center gap-2">
        <Database className="h-4 w-4 text-white" />
        <span className="font-semibold text-white">{data.label}</span>
        {data.isHypertable && (
          <span className="ml-auto text-xs bg-purple-500 px-2 py-0.5 rounded">HT</span>
        )}
      </div>

      {/* Columns */}
      <div className="p-2 space-y-1">
        {data.columns.slice(0, 6).map((col: any, idx: number) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-xs px-2 py-1.5 hover:bg-slate-800 rounded group"
          >
            {col.isPrimary && <Key className="h-3 w-3 text-yellow-500" />}
            {col.isForeign && !col.isPrimary && <Link className="h-3 w-3 text-green-500" />}
            <span className="font-mono flex-1 text-slate-200">{col.name}</span>
            <span className="text-slate-500 text-[10px]">{col.type}</span>

            {/* Handles for connections */}
            {col.isPrimary && (
              <Handle
                type="source"
                position={Position.Right}
                id={col.name}
                className="!w-2 !h-2 !bg-blue-500 !border-2 !border-slate-900"
              />
            )}
            {col.isForeign && (
              <Handle
                type="target"
                position={Position.Left}
                id={col.name}
                className="!w-2 !h-2 !bg-green-500 !border-2 !border-slate-900"
              />
            )}
          </div>
        ))}
        {data.columns.length > 6 && (
          <div className="text-xs text-slate-500 text-center py-1">
            +{data.columns.length - 6} weitere...
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 px-4 py-2 bg-slate-950/50 rounded-b-lg">
        <div className="text-xs text-slate-400">{data.recordCount} Einträge</div>
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';
