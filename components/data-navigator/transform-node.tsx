import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Database,
  Filter,
  Combine,
  BarChart3,
  Columns,
  FileOutput,
  Settings,
  ArrowRight,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  source: Database,
  filter: Filter,
  join: Combine,
  aggregate: BarChart3,
  select: Columns,
  output: FileOutput,
  transform: Settings,
};

const colorMap: Record<string, string> = {
  source: 'from-green-600 to-green-700',
  filter: 'from-orange-600 to-orange-700',
  join: 'from-cyan-600 to-cyan-700',
  aggregate: 'from-purple-600 to-purple-700',
  select: 'from-blue-600 to-blue-700',
  output: 'from-red-600 to-red-700',
  transform: 'from-slate-600 to-slate-700',
};

interface TransformNodeData {
  label: string;
  type: string;
  config: Record<string, unknown>;
  status: string;
  rowCount?: number;
}

export const TransformNode = memo(({ data: rawData }: NodeProps) => {
  const data = rawData as unknown as TransformNodeData;
  const Icon = iconMap[data.type] || Settings;
  const colorClass = colorMap[data.type] || 'from-slate-600 to-slate-700';

  return (
    <div className="bg-slate-900 border-2 border-slate-700 rounded-lg shadow-xl min-w-[280px] hover:border-blue-500 transition-colors">
      {data.type !== 'source' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900"
        />
      )}

      {/* Header */}
      <div className={`bg-gradient-to-r ${colorClass} px-4 py-3 rounded-t-lg flex items-center gap-2`}>
        <Icon className="h-4 w-4 text-white" />
        <span className="font-semibold text-white flex-1">{data.label}</span>
        <div
          className={`h-2 w-2 rounded-full ${
            data.status === 'ready'
              ? 'bg-green-400'
              : data.status === 'running'
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-slate-400'
          }`}
        />
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Typ:</span>
          <span className="text-slate-200 font-medium capitalize">{data.type}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Zeilen:</span>
          <span className="text-slate-200 font-semibold">
            {data.rowCount?.toLocaleString() || '—'}
          </span>
        </div>

        {/* Config preview */}
        {data.config && Object.keys(data.config).length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Konfiguration:</div>
            <div className="space-y-1">
              {Object.entries(data.config)
                .slice(0, 2)
                .map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="text-slate-500">{key}:</span>
                    <div className="font-mono text-slate-300 truncate text-[10px] mt-0.5">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  </div>
                ))}
              {Object.keys(data.config).length > 2 && (
                <div className="text-[10px] text-slate-500">
                  +{Object.keys(data.config).length - 2} weitere
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {data.type !== 'output' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900"
        />
      )}
    </div>
  );
});

TransformNode.displayName = 'TransformNode';
