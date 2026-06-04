'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Plus, Trash2, Play, Check, Loader2, Save } from 'lucide-react';
import apiClient from '@/lib/api/client';
import {
  useAlertRules,
  useCreateAlertRule,
  useDeleteAlertRule,
  useEvaluateAlertRule,
  useAlertEvents,
  useAcknowledgeAlertEvent,
} from '@/lib/hooks/use-alerts';
import type { AlertCondition, AlertSeverity } from '@/lib/api/types';

interface Device {
  id: string;
  name: string;
}
interface Metric {
  id: string;
  name: string;
  unit?: string;
}

const CONDITIONS: { value: AlertCondition; label: string; symbol: string }[] = [
  { value: 'greater_than', label: 'Greater than', symbol: '>' },
  { value: 'less_than', label: 'Less than', symbol: '<' },
  { value: 'greater_or_equal', label: 'Greater or equal', symbol: '≥' },
  { value: 'less_or_equal', label: 'Less or equal', symbol: '≤' },
  { value: 'equal_to', label: 'Equal to', symbol: '=' },
  { value: 'not_equal_to', label: 'Not equal to', symbol: '≠' },
];
const symbolFor = (c: string) => CONDITIONS.find((x) => x.value === c)?.symbol ?? c;

const severityClass = (s: AlertSeverity | string) =>
  s === 'critical'
    ? 'bg-red-500/15 text-red-500 border-red-500/30'
    : s === 'warning'
    ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
    : 'bg-blue-500/15 text-blue-500 border-blue-500/30';

const statusClass = (s: string) =>
  s === 'acknowledged'
    ? 'bg-green-500/15 text-green-500 border-green-500/30'
    : s === 'resolved'
    ? 'bg-muted text-muted-foreground'
    : 'bg-red-500/15 text-red-500 border-red-500/30';

export default function AlertsPage() {
  const { data: rules = [], isLoading: rulesLoading } = useAlertRules();
  const { data: events = [], isLoading: eventsLoading } = useAlertEvents();
  const createRule = useCreateAlertRule();
  const deleteRule = useDeleteAlertRule();
  const evaluateRule = useEvaluateAlertRule();
  const ackEvent = useAcknowledgeAlertEvent();

  const [creating, setCreating] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    deviceId: '',
    metricId: '',
    condition: 'greater_than' as AlertCondition,
    threshold: '',
    severity: 'warning' as AlertSeverity,
  });

  useEffect(() => {
    if (!creating) return;
    apiClient.get<Device[]>('/api/v1/devices').then((r) => setDevices(r.data || [])).catch(() => setDevices([]));
  }, [creating]);

  useEffect(() => {
    if (!form.deviceId) {
      setMetrics([]);
      return;
    }
    apiClient
      .get<Metric[]>(`/api/v1/devices/${form.deviceId}/metrics`)
      .then((r) => setMetrics(r.data || []))
      .catch(() => setMetrics([]));
  }, [form.deviceId]);

  const resetForm = () => {
    setForm({
      name: '', description: '', deviceId: '', metricId: '',
      condition: 'greater_than', threshold: '', severity: 'warning',
    });
  };

  const canSave = form.name && form.metricId && form.threshold !== '' && !Number.isNaN(Number(form.threshold));

  const handleSave = () => {
    if (!canSave) return;
    createRule.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        metric_id: form.metricId,
        device_id: form.deviceId || undefined,
        condition: form.condition,
        threshold: Number(form.threshold),
        severity: form.severity,
      },
      {
        onSuccess: () => {
          resetForm();
          setCreating(false);
        },
      }
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary">
              <Bell className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="section-header mb-0">Alerts</h1>
          </div>
          <p className="text-muted-foreground">
            Threshold rules on your metrics and the events they trigger
          </p>
        </div>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        {/* ----------------------------- Rules ----------------------------- */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            {!creating && (
              <Button onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Rule
              </Button>
            )}
          </div>

          {creating && (
            <Card>
              <CardHeader>
                <CardTitle>Create Alert Rule</CardTitle>
                <CardDescription>Trigger when a metric crosses a threshold.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Boiler over-temperature" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity</Label>
                    <Select value={form.severity} onValueChange={(v: any) => setForm({ ...form, severity: v })}>
                      <SelectTrigger id="severity"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Device</Label>
                    <Select value={form.deviceId} onValueChange={(v) => setForm({ ...form, deviceId: v, metricId: '' })}>
                      <SelectTrigger><SelectValue placeholder="Select a device" /></SelectTrigger>
                      <SelectContent>
                        {devices.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Metric</Label>
                    <Select value={form.metricId} onValueChange={(v) => setForm({ ...form, metricId: v })} disabled={!form.deviceId}>
                      <SelectTrigger><SelectValue placeholder="Select a metric" /></SelectTrigger>
                      <SelectContent>
                        {metrics.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} {m.unit ? `(${m.unit})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition</Label>
                    <Select value={form.condition} onValueChange={(v: any) => setForm({ ...form, condition: v })}>
                      <SelectTrigger id="condition"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label} ({c.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="threshold">Threshold</Label>
                    <Input id="threshold" type="number" value={form.threshold}
                      onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                      placeholder="e.g. 80" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" rows={2} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional" />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={handleSave} disabled={!canSave || createRule.isPending}>
                    {createRule.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => { resetForm(); setCreating(false); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {rulesLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 w-fit rounded-full bg-muted p-4">
                  <Bell className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No alert rules yet</h3>
                <p className="text-muted-foreground mb-4">Create a threshold rule to start monitoring.</p>
                {!creating && (
                  <Button onClick={() => setCreating(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Rule
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{rule.name}</span>
                        <Badge variant="outline" className={severityClass(rule.severity)}>
                          {rule.severity}
                        </Badge>
                        {!rule.is_active && <Badge variant="outline">inactive</Badge>}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground font-mono">
                        value {symbolFor(rule.condition)} {rule.threshold}
                      </div>
                      {rule.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
                      )}
                      {rule.last_triggered && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          last triggered {new Date(rule.last_triggered).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="outline" size="sm" onClick={() => evaluateRule.mutate(rule.id)}
                        disabled={evaluateRule.isPending}>
                        <Play className="mr-1.5 h-3.5 w-3.5" /> Evaluate
                      </Button>
                      <Button variant="ghost" size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (window.confirm(`Delete rule "${rule.name}"?`)) deleteRule.mutate(rule.id);
                        }}
                        aria-label={`Delete ${rule.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ----------------------------- Events ----------------------------- */}
        <TabsContent value="events" className="space-y-3">
          {eventsLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 w-fit rounded-full bg-muted p-4">
                  <Check className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No alert events</h3>
                <p className="text-muted-foreground">Evaluate a rule to generate events when thresholds are breached.</p>
              </CardContent>
            </Card>
          ) : (
            events.map((ev) => (
              <Card key={ev.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusClass(ev.status)}>{ev.status}</Badge>
                        <span className="font-mono text-sm">value = {ev.measurement_value}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        measured {new Date(ev.measurement_time).toLocaleString()} · triggered{' '}
                        {new Date(ev.triggered_at).toLocaleString()}
                        {ev.acknowledged_by && ` · ack by ${ev.acknowledged_by}`}
                      </div>
                    </div>
                    {ev.status === 'active' && (
                      <Button variant="outline" size="sm" className="shrink-0"
                        onClick={() => ackEvent.mutate(ev.id)} disabled={ackEvent.isPending}>
                        <Check className="mr-1.5 h-3.5 w-3.5" /> Acknowledge
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
