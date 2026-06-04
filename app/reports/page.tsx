'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Trash2, Play, Download, Save, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api/client';
import {
  useReports,
  useCreateReport,
  useDeleteReport,
  useGenerateReport,
} from '@/lib/hooks/use-reports';
import type { ReportGenerationResult } from '@/lib/api/types';

interface Device {
  id: string;
  name: string;
}
interface Metric {
  id: string;
  name: string;
  unit?: string;
}

const SCHEDULE_PRESETS = [
  { name: 'Daily at 8 AM', cron: '0 8 * * *' },
  { name: 'Weekly (Mon 9 AM)', cron: '0 9 * * 1' },
  { name: 'Monthly (1st, 8 AM)', cron: '0 8 1 * *' },
  { name: 'Every 6 hours', cron: '0 */6 * * *' },
];

const fmtNum = (n: number | null) => (n == null ? '—' : Number(n).toFixed(2));

function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name || 'report'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { data: reports = [], isLoading } = useReports();
  const createReport = useCreateReport();
  const deleteReport = useDeleteReport();
  const generateReport = useGenerateReport();

  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState<Record<string, ReportGenerationResult>>({});

  const [form, setForm] = useState({
    name: '', description: '', schedule: '0 8 * * *',
    type: 'metrics', format: 'json', recipients: '',
  });
  const [deviceId, setDeviceId] = useState('');
  const [metricIds, setMetricIds] = useState<string[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    if (!creating) return;
    apiClient.get<Device[]>('/api/v1/devices').then((r) => setDevices(r.data || [])).catch(() => setDevices([]));
  }, [creating]);

  useEffect(() => {
    if (!deviceId) {
      setMetrics([]);
      return;
    }
    apiClient.get<Metric[]>(`/api/v1/devices/${deviceId}/metrics`).then((r) => setMetrics(r.data || [])).catch(() => setMetrics([]));
  }, [deviceId]);

  const resetForm = () => {
    setForm({ name: '', description: '', schedule: '0 8 * * *', type: 'metrics', format: 'json', recipients: '' });
    setDeviceId('');
    setMetricIds([]);
  };

  const toggleMetric = (id: string) =>
    setMetricIds((cur) => (cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id]));

  const handleSave = () => {
    if (!form.name || !form.schedule) return;
    createReport.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        schedule: form.schedule,
        type: form.type,
        format: form.format,
        recipients: form.recipients.split(',').map((s) => s.trim()).filter(Boolean),
        configuration: { metric_ids: metricIds },
      },
      {
        onSuccess: () => {
          resetForm();
          setCreating(false);
        },
      }
    );
  };

  const handleGenerate = (id: string) =>
    generateReport.mutate(id, { onSuccess: (r) => setResults((p) => ({ ...p, [id]: r })) });

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="section-header mb-0">Scheduled Reports</h1>
          </div>
          <p className="text-muted-foreground">
            Report definitions and on-demand generation (metric summaries)
          </p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Report
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {creating && (
            <Card>
              <CardHeader>
                <CardTitle>Create Report</CardTitle>
                <CardDescription>
                  A “metrics” report summarises the selected metrics over the period.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Weekly metric summary" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schedule">Schedule (cron)</Label>
                    <Input id="schedule" className="font-mono" value={form.schedule}
                      onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="0 8 * * *" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metrics">Metrics</SelectItem>
                        <SelectItem value="dashboard">Dashboard</SelectItem>
                        <SelectItem value="alerts">Alerts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="pdf">PDF (stub)</SelectItem>
                        <SelectItem value="excel">Excel (stub)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipients">Recipients (comma-separated)</Label>
                  <Input id="recipients" value={form.recipients}
                    onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                    placeholder="alice@example.com, team@example.com" />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Device</Label>
                    <Select value={deviceId} onValueChange={(v) => { setDeviceId(v); setMetricIds([]); }}>
                      <SelectTrigger><SelectValue placeholder="Select a device" /></SelectTrigger>
                      <SelectContent>
                        {devices.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Metrics ({metricIds.length} selected)</Label>
                    <div className="max-h-32 overflow-y-auto rounded-md border p-2 space-y-1">
                      {metrics.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {deviceId ? 'No metrics' : 'Select a device first'}
                        </p>
                      ) : metrics.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 p-1 hover:bg-accent rounded cursor-pointer">
                          <input type="checkbox" className="rounded" checked={metricIds.includes(m.id)}
                            onChange={() => toggleMetric(m.id)} />
                          <span className="text-sm">{m.name} {m.unit ? `(${m.unit})` : ''}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" rows={2} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={handleSave} disabled={!form.name || !form.schedule || createReport.isPending}>
                    {createReport.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => { resetForm(); setCreating(false); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 w-fit rounded-full bg-muted p-4">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No reports yet</h3>
                <p className="text-muted-foreground mb-4">Define a report, then generate a metric summary.</p>
                {!creating && <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> New Report</Button>}
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => {
              const result = results[report.id];
              return (
                <Card key={report.id}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{report.name}</span>
                          <Badge variant="outline" className="capitalize">{report.type}</Badge>
                          <Badge variant="outline" className="uppercase">{report.format}</Badge>
                          {!report.is_active && <Badge variant="outline">inactive</Badge>}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          <span className="font-mono">{report.schedule}</span> · {report.recipients.length} recipient(s)
                          {report.last_run && ` · last run ${new Date(report.last_run).toLocaleString()}`}
                        </div>
                        {report.description && <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleGenerate(report.id)}
                          disabled={generateReport.isPending}>
                          <Play className="mr-1.5 h-3.5 w-3.5" /> Generate
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"
                          onClick={() => { if (window.confirm(`Delete report "${report.name}"?`)) deleteReport.mutate(report.id); }}
                          aria-label={`Delete ${report.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {result && (
                      <div className="rounded-md border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {result.sections.length} section(s) · generated {new Date(result.generated_at).toLocaleString()}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => downloadCsv(report.name, result.csv)}>
                            <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
                          </Button>
                        </div>
                        {result.sections.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No metrics configured (or no data in range).
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-muted-foreground">
                                  <th className="py-1 pr-3">Metric</th>
                                  <th className="py-1 pr-3 text-right">Count</th>
                                  <th className="py-1 pr-3 text-right">Min</th>
                                  <th className="py-1 pr-3 text-right">Max</th>
                                  <th className="py-1 pr-3 text-right">Avg</th>
                                  <th className="py-1 text-right">Sum</th>
                                </tr>
                              </thead>
                              <tbody>
                                {result.sections.map((s) => (
                                  <tr key={s.metric_id} className="border-t">
                                    <td className="py-1 pr-3">{s.metric_name || s.metric_id} {s.unit ? `(${s.unit})` : ''}</td>
                                    <td className="py-1 pr-3 text-right font-mono">{s.stats.count ?? 0}</td>
                                    <td className="py-1 pr-3 text-right font-mono">{fmtNum(s.stats.min)}</td>
                                    <td className="py-1 pr-3 text-right font-mono">{fmtNum(s.stats.max)}</td>
                                    <td className="py-1 pr-3 text-right font-mono">{fmtNum(s.stats.avg)}</td>
                                    <td className="py-1 text-right font-mono">{fmtNum(s.stats.sum)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">{result.note}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Help */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Schedule presets</CardTitle>
              <CardDescription>Cron patterns (scheduler not yet active)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {SCHEDULE_PRESETS.map((p) => (
                <button
                  key={p.cron}
                  type="button"
                  onClick={() => { setCreating(true); setForm((f) => ({ ...f, schedule: p.cron })); }}
                  className="w-full text-left p-2 bg-muted rounded-md hover:bg-accent transition-colors"
                >
                  <div className="font-medium">{p.name}</div>
                  <code className="text-xs text-muted-foreground">{p.cron}</code>
                </button>
              ))}
              <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Cron: minute hour day month weekday</p>
                <p>Delivery (PDF/Excel/e-mail) and the scheduler are not implemented;
                  “Generate” returns the data and a CSV.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
