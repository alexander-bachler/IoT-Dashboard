'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle, Check, TrendingUp } from 'lucide-react';
import { useAnomalies, useUpdateAnomaly, useAnomalyStatistics } from '@/lib/hooks/use-anomalies';
import { TableSkeleton } from '@/components/ui/skeleton-loader';
import { NoAnomaliesState, ErrorState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { format } from 'date-fns';

function AnomalyCard({ anomaly }: { anomaly: any }) {
  const { mutate: updateAnomaly, isPending } = useUpdateAnomaly();

  const handleAcknowledge = () => {
    // acknowledged_by is set server-side from the authenticated user
    updateAnomaly({
      id: anomaly.id,
      data: {
        acknowledged: true,
      },
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'from-red-500/20 to-orange-500/20 border-red-500/30';
      case 'high':
        return 'from-orange-500/20 to-yellow-500/20 border-orange-500/30';
      case 'medium':
        return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
      default:
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <XCircle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getSeverityTextColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'medium':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  const isAcknowledged = anomaly.acknowledged === true;

  return (
    <div
      className={`p-4 rounded-xl border bg-gradient-to-br ${getSeverityColor(anomaly.severity)} ${
        isAcknowledged ? 'opacity-60' : ''
      } hover-scale`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3 flex-1">
          <div className={`p-2 rounded-lg ${getSeverityTextColor(anomaly.severity)}`}>
            {getSeverityIcon(anomaly.severity)}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold">Anomaly Detected</h4>
              <Badge variant="outline" className="uppercase text-xs">
                {anomaly.severity}
              </Badge>
              {isAcknowledged && (
                <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
                  <Check className="h-3 w-3 mr-1" />
                  acknowledged
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {format(new Date(anomaly.timestamp), 'PPp')}
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Value:</span>{' '}
                <span className="font-medium font-mono">{anomaly.value.toFixed(2)}</span>
              </div>
              {anomaly.z_score && (
                <div>
                  <span className="text-muted-foreground">Z-Score:</span>{' '}
                  <span className="font-medium font-mono">{anomaly.z_score.toFixed(2)}</span>
                </div>
              )}
            </div>

            {anomaly.description && (
              <p className="text-sm mt-3 text-muted-foreground italic">"{anomaly.description}"</p>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAcknowledge}
          disabled={isAcknowledged || isPending}
          className="shrink-0"
        >
          {isPending ? 'Acknowledging...' : isAcknowledged ? 'Acknowledged' : 'Acknowledge'}
        </Button>
      </div>
    </div>
  );
}

function AnomaliesContent() {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, error, refetch } = useAnomalies({
    severity: severityFilter !== 'all' ? [severityFilter as any] : undefined,
    status: statusFilter !== 'all' ? [statusFilter as any] : undefined,
    limit: 50,
  });

  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  if (error) {
    return <ErrorState title="Failed to load anomalies" description={error.message} onRetry={refetch} />;
  }

  const anomalies = data?.data || [];

  if (anomalies.length === 0) {
    return <NoAnomaliesState />;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Detected Anomalies</CardTitle>
            <CardDescription className="mt-1">
              {data?.total} anomal{data?.total !== 1 ? 'ies' : 'y'} found
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {anomalies.map((anomaly) => (
          <AnomalyCard key={anomaly.id} anomaly={anomaly} />
        ))}
      </CardContent>
    </Card>
  );
}

export default function AnomaliesPage() {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: stats, isLoading: statsLoading } = useAnomalyStatistics();

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        {/* Gradient orbs */}
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-red-500/20 rounded-full blur-3xl" />
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl" />

        {/* Header */}
        <div className="relative">
          <h1 className="section-header">Anomaly Detection</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage detected anomalies in your IoT data streams
          </p>
        </div>

        {/* Statistics Cards */}
        {stats && !statsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="metric-card hover-scale">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Anomalies</div>
                  <div className="text-2xl font-bold gradient-text">{stats.total}</div>
                </div>
              </div>
            </div>

            <div className="metric-card hover-scale">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <XCircle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                  <div className="text-2xl font-bold gradient-text">{stats.by_severity?.critical || 0}</div>
                </div>
              </div>
            </div>

            <div className="metric-card hover-scale">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Resolved</div>
                  <div className="text-2xl font-bold gradient-text">{stats.by_status?.resolved || 0}</div>
                </div>
              </div>
            </div>

            <div className="metric-card hover-scale">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">New (24h)</div>
                  <div className="text-2xl font-bold gradient-text">{stats.by_status?.new || 0}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Severity</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="false_positive">False Positive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anomalies List */}
        <AnomaliesContent />
      </div>
    </ErrorBoundary>
  );
}
