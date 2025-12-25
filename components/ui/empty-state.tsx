import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Database,
  FileQuestion,
  BarChart3,
  Workflow,
  AlertTriangle,
  SearchX,
  Inbox,
  LucideIcon,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-12 glass-card',
        className
      )}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-full blur-2xl" />
        <div className="relative p-6 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-600/10 border border-blue-500/20">
          <Icon className="h-12 w-12 text-muted-foreground" />
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-md mb-6">{description}</p>

      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" className="gap-2">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function NoDataSourcesState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={Database}
      title="No Data Sources"
      description="You haven't added any data sources yet. Connect to your first data source to start analyzing IoT data."
      action={{
        label: 'Add Data Source',
        onClick: onAdd,
      }}
    />
  );
}

export function NoChartsState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={BarChart3}
      title="No Charts Created"
      description="Create your first chart to visualize your IoT data. Choose from multiple chart types including line, bar, scatter, and more."
      action={{
        label: 'Create Chart',
        onClick: onCreate,
      }}
    />
  );
}

export function NoAnomaliesState() {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="No Anomalies Detected"
      description="Great news! No anomalies have been detected in your IoT data streams. The system is monitoring all metrics continuously."
      className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5"
    />
  );
}

export function NoPipelinesState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={Workflow}
      title="No ETL Pipelines"
      description="Create your first ETL pipeline to transform and process your IoT data. Build visual data flows with our drag-and-drop designer."
      action={{
        label: 'Create Pipeline',
        onClick: onCreate,
      }}
    />
  );
}

export function SearchEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title="No Results Found"
      description={`No results found for "${query}". Try adjusting your search terms or filters.`}
    />
  );
}

export function NoDataState({
  title = 'No Data Available',
  description = 'There is no data to display at the moment. Please check back later or adjust your filters.',
}: {
  title?: string;
  description?: string;
}) {
  return <EmptyState icon={FileQuestion} title={title} description={description} />;
}

export function ErrorState({
  title = 'Something Went Wrong',
  description = 'An unexpected error occurred. Please try again or contact support if the problem persists.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry,
            }
          : undefined
      }
      className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-orange-500/5"
    />
  );
}
