'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calculator, Save } from 'lucide-react';

export default function CalculationsPage() {
  const [calculations, setCalculations] = useState([
    {
      id: '1',
      name: 'Total Power Consumption',
      formula: 'SUM(solar_power, grid_power)',
      sourceMetrics: ['solar_power', 'grid_power'],
      unit: 'kW',
      aggregationType: 'sum',
    },
    {
      id: '2',
      name: 'Average Temperature',
      formula: 'AVG(temp_sensor_1, temp_sensor_2, temp_sensor_3)',
      sourceMetrics: ['temp_sensor_1', 'temp_sensor_2', 'temp_sensor_3'],
      unit: '°C',
      aggregationType: 'avg',
    },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [newCalc, setNewCalc] = useState({
    name: '',
    description: '',
    formula: '',
    unit: '',
    aggregationType: 'none',
  });

  const handleCreateCalculation = () => {
    // In a real app, this would call the API
    console.log('Creating calculation:', newCalc);
    setIsCreating(false);
    setNewCalc({
      name: '',
      description: '',
      formula: '',
      unit: '',
      aggregationType: 'none',
    });
  };

  const formulaExamples = [
    { name: 'Sum', formula: 'SUM(metric1, metric2, ...)' },
    { name: 'Average', formula: 'AVG(metric1, metric2, ...)' },
    { name: 'Multiply', formula: 'metric1 * 1.5' },
    { name: 'Subtract', formula: 'metric1 - metric2' },
    { name: 'Ratio', formula: '(metric1 / metric2) * 100' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Custom Calculations</h1>
          <p className="text-muted-foreground">
            Create derived metrics using formulas and aggregations
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calculation Builder */}
          <div className="lg:col-span-2">
            {isCreating ? (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Calculation</CardTitle>
                  <CardDescription>
                    Define a formula to create a derived metric
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Calculation Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Total Energy Consumption"
                      value={newCalc.name}
                      onChange={(e) => setNewCalc({ ...newCalc, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Optional description of what this calculation does"
                      value={newCalc.description}
                      onChange={(e) => setNewCalc({ ...newCalc, description: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="formula">Formula *</Label>
                    <Textarea
                      id="formula"
                      placeholder="e.g., SUM(metric1, metric2) or metric1 * 1.5"
                      value={newCalc.formula}
                      onChange={(e) => setNewCalc({ ...newCalc, formula: e.target.value })}
                      rows={3}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Supported functions: SUM, AVG, MIN, MAX, MULTIPLY, DIVIDE
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <Input
                        id="unit"
                        placeholder="e.g., kW, °C, %"
                        value={newCalc.unit}
                        onChange={(e) => setNewCalc({ ...newCalc, unit: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="aggregation">Aggregation Type</Label>
                      <Select
                        value={newCalc.aggregationType}
                        onValueChange={(value) =>
                          setNewCalc({ ...newCalc, aggregationType: value })
                        }
                      >
                        <SelectTrigger id="aggregation">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="sum">Sum</SelectItem>
                          <SelectItem value="avg">Average</SelectItem>
                          <SelectItem value="min">Minimum</SelectItem>
                          <SelectItem value="max">Maximum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleCreateCalculation}
                      disabled={!newCalc.name || !newCalc.formula}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Calculation
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Saved Calculations</h2>
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Calculation
                  </Button>
                </div>

                {calculations.map((calc) => (
                  <Card key={calc.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Calculator className="h-5 w-5" />
                            {calc.name}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {calc.formula}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Source Metrics:</span>
                          <div className="font-medium mt-1">
                            {calc.sourceMetrics.length} metrics
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unit:</span>
                          <div className="font-medium mt-1">{calc.unit || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Aggregation:</span>
                          <div className="font-medium mt-1 capitalize">
                            {calc.aggregationType}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Formula Examples & Help */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Formula Examples</CardTitle>
                <CardDescription>Common calculation patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formulaExamples.map((example, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <div className="font-medium mb-1">{example.name}</div>
                    <code className="text-xs text-muted-foreground break-all">
                      {example.formula}
                    </code>
                  </div>
                ))}

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Supported Functions</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• SUM(...) - Add values</li>
                    <li>• AVG(...) - Calculate average</li>
                    <li>• MIN(...) - Find minimum</li>
                    <li>• MAX(...) - Find maximum</li>
                    <li>• Basic operators: +, -, *, /</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
