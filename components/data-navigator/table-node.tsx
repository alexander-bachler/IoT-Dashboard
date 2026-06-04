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
    <div className="min-w-[250px] rounded-lg border border-border bg-card shadow-md transition-colors hover:border-primary">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Database className="h-4 w-4 text-primary" />
        <span className="font-semibold text-foreground">{data.label}</span>
        {data.isHypertable && (
          <span className="ml-auto rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            HT
          </span>
        )}
      </div>

      {/* Columns */}
      <div className="space-y-1 p-2">
        {data.columns.slice(0, 6).map((col: any, idx: number) => (
          <div
            key={idx}
            className="group flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
          >
            {col.isPrimary && <Key className="h-3 w-3 text-amber-500" />}
            {col.isForeign && !col.isPrimary && <Link className="h-3 w-3 text-green-500" />}
            <span className="flex-1 font-mono text-foreground">{col.name}</span>
            <span className="text-[10px] text-muted-foreground">{col.type}</span>

            {/* Handles for connections */}
            {col.isPrimary && (
              <Handle
                type="source"
                position={Position.Right}
                id={col.name}
                className="!h-2 !w-2 !border-2 !border-background !bg-primary"
              />
            )}
            {col.isForeign && (
              <Handle
                type="target"
                position={Position.Left}
                id={col.name}
                className="!h-2 !w-2 !border-2 !border-background !bg-green-500"
              />
            )}
          </div>
        ))}
        {data.columns.length > 6 && (
          <div className="py-1 text-center text-xs text-muted-foreground">
            +{data.columns.length - 6} weitere...
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="rounded-b-lg border-t border-border bg-muted/30 px-4 py-2">
        <div className="text-xs text-muted-foreground">{data.recordCount} Einträge</div>
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';
