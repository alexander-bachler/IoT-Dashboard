'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calculator, Save, Trash2, Play, X, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api/client';
import {
  useCalculations,
  useCreateCalculation,
  useDeleteCalculation,
  usePreviewCalculation,
} from '@/lib/hooks/use-calculations';
import type { CalculationResult } from '@/lib/api/types';

interface Device {
  id: string;
  name: string;
}
interface Metric {
  id: string;
  name: string;
  unit?: string;
}
interface VarRow {
  id: string;
  name: string;
  deviceId: string;
  metricId: string;
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

function VariableRow({
  row,
  devices,
  onChange,
  onRemove,
}: {
  row: VarRow;
  devices: Device[];
  onChange: (r: VarRow) => void;
  onRemove: () => void;
}) {
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    if (!row.deviceId) {
      setMetrics([]);
      return;
    }
    apiClient
      .get<Metric[]>(`/api/v1/devices/${row.deviceId}/metrics`)
      .then((r) => setMetrics(r.data || []))
      .catch(() => setMetrics([]));
  }, [row.deviceId]);

  return (
    <div className="flex items-center gap-2">
      <Input
        className="w-20 font-mono"
        placeholder="var"
        value={row.name}
        onChange={(e) => onChange({ ...row, name: e.target.value.trim() })}
        aria-label="Variable name"
      />
      <Select
        value={row.deviceId}
        onValueChange={(v) => onChange({ ...row, deviceId: v, metricId: '' })}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Device" />
        </SelectTrigger>
        <SelectContent>
          {devices.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={row.metricId}
        onValueChange={(v) => onChange({ ...row, metricId: v })}
        disabled={!row.deviceId}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Metric" />
        </SelectTrigger>
        <SelectContent>
          {metrics.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name} {m.unit ? `(${m.unit})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove variable">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function CalculationsPage() {
  const { data: calculations = [], isLoading } = useCalculations();
  const createCalc = useCreateCalculation();
  const deleteCalc = useDeleteCalculation();
  const previewCalc = usePreviewCalculation();

  const [isCreating, setIsCreating] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [aggregationType, setAggregationType] = useState('none');
  const [formula, setFormula] = useState('');
  const [variables, setVariables] = useState<VarRow[]>([
    { id: uid(), name: 'a', deviceId: '', metricId: '' },
  ]);
  const [preview, setPreview] = useState<CalculationResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCreating) return;
    apiClient
      .get<Device[]>('/api/v1/devices')
      .then((r) => setDevices(r.data || []))
      .catch(() => setDevices([]));
  }, [isCreating]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setUnit('');
    setAggregationType('none');
    setFormula('');
    setVariables([{ id: uid(), name: 'a', deviceId: '', metricId: '' }]);
    setPreview(null);
    setPreviewError(null);
  };

  const buildSourceMetricIds = () =>
    Object.fromEntries(
      variables.filter((v) => v.name && v.metricId).map((v) => [v.name, v.metricId])
    );

  const handlePreview = () => {
    setPreview(null);
    setPreviewError(null);
    previewCalc.mutate(
      {
        formula,
        source_metric_ids: buildSourceMetricIds(),
        interval: '1 hour',
        aggregation_type: aggregationType,
      },
      {
        onSuccess: (r) => setPreview(r),
        onError: (e: any) =>
          setPreviewError(e?.response?.data?.detail || e?.message || 'Preview failed'),
      }
    );
  };

  const handleSave = () => {
    createCalc.mutate(
      {
        name,
        description: description || undefined,
        formula,
        source_metric_ids: buildSourceMetricIds(),
        unit: unit || undefined,
        aggregation_type: aggregationType,
      },
      {
        onSuccess: () => {
          resetForm();
          setIsCreating(false);
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
              <Calculator className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="section-header mb-0">Custom Calculations</h1>
          </div>
          <p className="text-muted-foreground">
            Derived metrics from a safe formula over your source metrics
          </p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Calculation
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isCreating ? (
            <Card>
              <CardHeader>
                <CardTitle>Create Calculation</CardTitle>
                <CardDescription>
                  Map variables to metrics, then reference them in the formula (e.g.{' '}
                  <code className="font-mono">a * b</code>).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Active Power" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g. kW" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" rows={2} value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Variables</Label>
                    <Button variant="outline" size="sm"
                      onClick={() => setVariables((v) => [...v, { id: uid(), name: '', deviceId: '', metricId: '' }])}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {variables.map((row) => (
                      <VariableRow
                        key={row.id}
                        row={row}
                        devices={devices}
                        onChange={(r) => setVariables((vs) => vs.map((x) => (x.id === r.id ? r : x)))}
                        onRemove={() => setVariables((vs) => vs.filter((x) => x.id !== row.id))}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="formula">Formula *</Label>
                  <Textarea id="formula" rows={2} className="font-mono" value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    placeholder="e.g. a * b   or   (a - b) / c * 100" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aggregation">Series aggregation</Label>
                  <Select value={aggregationType} onValueChange={setAggregationType}>
                    <SelectTrigger id="aggregation" className="sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (series)</SelectItem>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="avg">Average</SelectItem>
                      <SelectItem value="min">Minimum</SelectItem>
                      <SelectItem value="max">Maximum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={handleSave} disabled={!name || !formula || createCalc.isPending}>
                    {createCalc.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                  <Button variant="outline" onClick={handlePreview} disabled={!formula || previewCalc.isPending}>
                    {previewCalc.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Preview
                  </Button>
                  <Button variant="ghost" onClick={() => { resetForm(); setIsCreating(false); }}>
                    Cancel
                  </Button>
                </div>

                {previewError && (
                  <div className="warning-banner text-sm">
                    <span className="font-medium">Preview error:</span> {previewError}
                  </div>
                )}
                {preview && !previewError && (
                  <div className="info-banner text-sm space-y-1">
                    <div className="font-medium">Preview ({preview.interval} buckets)</div>
                    <div className="text-muted-foreground">
                      {preview.points} point{preview.points !== 1 ? 's' : ''} in the last 7 days
                      {preview.points === 0 && ' — formula is valid; no measurement data in range'}
                    </div>
                    {preview.aggregate != null && (
                      <div>
                        Aggregate (<span className="font-mono">{aggregationType}</span>):{' '}
                        <span className="font-mono font-semibold">{preview.aggregate.toFixed(3)}</span>
                        {unit ? ` ${unit}` : ''}
                      </div>
                    )}
                    {preview.data.length > 0 && (
                      <div className="font-mono text-xs text-muted-foreground">
                        latest: {preview.data[preview.data.length - 1].value.toFixed(3)} @{' '}
                        {new Date(preview.data[preview.data.length - 1].time).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {isLoading ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
              ) : calculations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="mx-auto mb-4 w-fit rounded-full bg-muted p-4">
                      <Calculator className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No calculations yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create a derived metric from a formula over your source metrics.
                    </p>
                    <Button onClick={() => setIsCreating(true)}>
                      <Plus className="mr-2 h-4 w-4" /> New Calculation
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                calculations.map((calc) => (
                  <Card key={calc.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2">
                            <Calculator className="h-5 w-5 shrink-0" />
                            {calc.name}
                          </CardTitle>
                          <CardDescription className="mt-2 font-mono break-all">
                            {calc.formula}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (window.confirm(`Delete calculation "${calc.name}"?`)) deleteCalc.mutate(calc.id);
                          }}
                          aria-label={`Delete ${calc.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {Object.keys(calc.source_metric_ids || {}).length} variable(s)
                        </Badge>
                        {calc.unit && <Badge variant="outline">Unit: {calc.unit}</Badge>}
                        <Badge variant="outline" className="capitalize">
                          Agg: {calc.aggregation_type}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Help */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Formula reference</CardTitle>
              <CardDescription>Variables map to metrics; combine them arithmetically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                {[
                  { name: 'Product', f: 'a * b' },
                  { name: 'Ratio (%)', f: '(a / b) * 100' },
                  { name: 'Difference', f: 'a - b' },
                  { name: 'Clamp max', f: 'min(a, 100)' },
                ].map((ex) => (
                  <div key={ex.name} className="p-2 bg-muted rounded-md">
                    <div className="font-medium">{ex.name}</div>
                    <code className="text-xs text-muted-foreground">{ex.f}</code>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t">
                <h4 className="font-medium mb-2">Operators &amp; functions</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Operators: <code>+ - * / // % **</code></li>
                  <li>• <code>abs min max round sqrt pow</code></li>
                  <li>• <code>exp log log10 floor ceil</code></li>
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Formulas run in a safe evaluator — no arbitrary code.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
