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

// Per-type accent applied to the icon only (keeps node categorisation without
// painting the whole header). Everything else uses theme tokens.
const iconColorMap: Record<string, string> = {
  source: 'text-green-500',
  filter: 'text-orange-500',
  join: 'text-cyan-500',
  aggregate: 'text-purple-500',
  select: 'text-blue-500',
  output: 'text-red-500',
  transform: 'text-muted-foreground',
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
  const iconColor = iconColorMap[data.type] || 'text-muted-foreground';

  return (
    <div className="min-w-[280px] rounded-lg border border-border bg-card shadow-md transition-colors hover:border-primary">
      {data.type !== 'source' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-3 !w-3 !border-2 !border-background !bg-primary"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="flex-1 font-semibold text-foreground">{data.label}</span>
        <div
          className={`h-2 w-2 rounded-full ${
            data.status === 'ready'
              ? 'bg-green-500'
              : data.status === 'running'
                ? 'animate-pulse bg-amber-500'
                : 'bg-muted-foreground/40'
          }`}
        />
      </div>

      {/* Body */}
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Typ:</span>
          <span className="font-medium capitalize text-foreground">{data.type}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Zeilen:</span>
          <span className="font-semibold text-foreground">
            {data.rowCount?.toLocaleString() || '—'}
          </span>
        </div>

        {/* Config preview */}
        {data.config && Object.keys(data.config).length > 0 && (
          <div className="mt-2 border-t border-border pt-2">
            <div className="mb-1 text-xs text-muted-foreground">Konfiguration:</div>
            <div className="space-y-1">
              {Object.entries(data.config)
                .slice(0, 2)
                .map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="text-muted-foreground">{key}:</span>
                    <div className="mt-0.5 truncate font-mono text-[10px] text-foreground">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  </div>
                ))}
              {Object.keys(data.config).length > 2 && (
                <div className="text-[10px] text-muted-foreground">
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
          className="!h-3 !w-3 !border-2 !border-background !bg-primary"
        />
      )}
    </div>
  );
});

TransformNode.displayName = 'TransformNode';
