'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface Anomaly {
  id: string;
  metricName: string;
  deviceName: string;
  timestamp: string;
  value: number;
  expectedValue?: number;
  zScore?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description?: string;
  acknowledged: boolean;
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>('all');

  const fetchAnomalies = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (acknowledgedFilter !== 'all') {
        params.set('acknowledged', acknowledgedFilter === 'true' ? 'true' : 'false');
      }
      params.set('limit', '50');

      const response = await fetch(`/api/anomalies?${params}`);
      const data = await response.json();
      setAnomalies(data.anomalies || []);
    } catch (error) {
      console.error('Error fetching anomalies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [severityFilter, acknowledgedFilter]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 dark:bg-red-950';
      case 'high':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-950';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
      default:
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <XCircle className="h-5 w-5" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Anomaly Detection</h1>
          <p className="text-muted-foreground">
            Monitor and manage detected anomalies in your IoT data
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
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
                <Select value={acknowledgedFilter} onValueChange={setAcknowledgedFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="false">Unacknowledged</SelectItem>
                    <SelectItem value="true">Acknowledged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={fetchAnomalies} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anomalies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detected Anomalies</CardTitle>
            <CardDescription>
              {anomalies.length} anomalie{anomalies.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading anomalies...</div>
            ) : anomalies.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p className="text-lg font-medium">No anomalies detected</p>
                <p className="text-muted-foreground">Your data looks healthy!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {anomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className={`p-4 rounded-lg border ${
                      anomaly.acknowledged ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3 flex-1">
                        <div className={`p-2 rounded-md ${getSeverityColor(anomaly.severity)}`}>
                          {getSeverityIcon(anomaly.severity)}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{anomaly.metricName}</h4>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(
                                anomaly.severity
                              )}`}
                            >
                              {anomaly.severity}
                            </span>
                            {anomaly.acknowledged && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 dark:bg-green-950">
                                Acknowledged
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">
                            {anomaly.deviceName} • {new Date(anomaly.timestamp).toLocaleString()}
                          </p>

                          <div className="flex gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Value:</span>{' '}
                              <span className="font-medium">{anomaly.value.toFixed(2)}</span>
                            </div>
                            {anomaly.expectedValue && (
                              <div>
                                <span className="text-muted-foreground">Expected:</span>{' '}
                                <span className="font-medium">
                                  {anomaly.expectedValue.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {anomaly.zScore && (
                              <div>
                                <span className="text-muted-foreground">Z-Score:</span>{' '}
                                <span className="font-medium">{anomaly.zScore.toFixed(2)}</span>
                              </div>
                            )}
                          </div>

                          {anomaly.description && (
                            <p className="text-sm mt-2 text-muted-foreground">
                              {anomaly.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button variant="outline" size="sm" disabled={anomaly.acknowledged}>
                        {anomaly.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
