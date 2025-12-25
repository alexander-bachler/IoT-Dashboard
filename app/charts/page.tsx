'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeSeriesChart } from '@/components/explorer/time-series-chart';
import { ScatterPlot } from '@/components/charts/scatter-plot';
import { Heatmap } from '@/components/charts/heatmap';
import { GaugeChart } from '@/components/charts/gauge-chart';
import { RadarChart } from '@/components/charts/radar-chart';
import { PieChart } from '@/components/charts/pie-chart';
import { Treemap } from '@/components/charts/treemap';
import { Boxplot } from '@/components/charts/boxplot';
import { FunnelChart } from '@/components/charts/funnel-chart';
import { SankeyDiagram } from '@/components/charts/sankey-diagram';
import { ChartBuilder } from '@/components/charts/chart-builder';

// Sample data generators
const generateTimeSeries = () => {
  const now = new Date();
  return Array.from({ length: 50 }, (_, i) => ({
    time: new Date(now.getTime() - (49 - i) * 3600000).toISOString(),
    value: Math.random() * 100 + Math.sin(i / 5) * 20,
  }));
};

const sampleSeries = [
  {
    metricId: '1',
    metricName: 'Temperature',
    metricUnit: '°C',
    data: generateTimeSeries(),
  },
  {
    metricId: '2',
    metricName: 'Humidity',
    metricUnit: '%',
    data: generateTimeSeries(),
  },
];

export default function ChartsGalleryPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Chart Gallery</h1>
          <p className="text-muted-foreground">
            Explore all available visualization types for IoT time-series data
          </p>
        </div>

        <Tabs defaultValue="builder" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="timeseries">Time-Series</TabsTrigger>
            <TabsTrigger value="statistical">Statistical</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="flow">Flow</TabsTrigger>
          </TabsList>

          {/* Chart Builder */}
          <TabsContent value="builder">
            <ChartBuilder />
          </TabsContent>

          {/* Time-Series Charts */}
          <TabsContent value="timeseries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Line Chart</CardTitle>
                <CardDescription>
                  Standard time-series visualization, ideal for continuous data trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart series={sampleSeries} chartType="line" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Area Chart</CardTitle>
                <CardDescription>
                  Filled line chart, emphasizes magnitude over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart series={sampleSeries} chartType="area" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bar Chart</CardTitle>
                <CardDescription>
                  Categorical or discrete time-series data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart series={sampleSeries.slice(0, 1)} chartType="bar" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistical Charts */}
          <TabsContent value="statistical" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scatter Plot</CardTitle>
                <CardDescription>
                  Correlation between two metrics or time-series analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScatterPlot
                  series={sampleSeries}
                  xAxisLabel="Temperature (°C)"
                  yAxisLabel="Humidity (%)"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Heatmap</CardTitle>
                <CardDescription>
                  2D data visualization with color intensity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Heatmap
                  data={Array.from({ length: 168 }, (_, i) => ({
                    x: i % 24,
                    y: Math.floor(i / 24),
                    value: Math.random() * 100,
                  }))}
                  xAxisLabels={Array.from({ length: 24 }, (_, i) => `${i}:00`)}
                  yAxisLabels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Boxplot</CardTitle>
                <CardDescription>
                  Statistical distribution with quartiles and outliers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Boxplot
                  data={[
                    { name: 'Sensor A', data: Array.from({ length: 50 }, () => Math.random() * 100) },
                    { name: 'Sensor B', data: Array.from({ length: 50 }, () => Math.random() * 80 + 10) },
                    { name: 'Sensor C', data: Array.from({ length: 50 }, () => Math.random() * 60 + 20) },
                  ]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Charts */}
          <TabsContent value="distribution" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pie Chart</CardTitle>
                <CardDescription>
                  Part-to-whole relationships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={[
                    { name: 'Temperature Sensor', value: 335 },
                    { name: 'Humidity Sensor', value: 234 },
                    { name: 'Pressure Sensor', value: 154 },
                    { name: 'Light Sensor', value: 135 },
                    { name: 'Motion Sensor', value: 123 },
                  ]}
                  title="Sensor Distribution"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Donut Chart</CardTitle>
                <CardDescription>
                  Pie chart variant with center hole for labels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={[
                    { name: 'Active', value: 435 },
                    { name: 'Idle', value: 234 },
                    { name: 'Warning', value: 154 },
                    { name: 'Error', value: 35 },
                  ]}
                  title="Device Status"
                  isDonut={true}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Treemap</CardTitle>
                <CardDescription>
                  Hierarchical data visualization with nested rectangles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Treemap
                  data={[
                    { name: 'Building A', value: 1200 },
                    { name: 'Building B', value: 890 },
                    { name: 'Building C', value: 756 },
                    { name: 'Building D', value: 543 },
                    { name: 'Building E', value: 432 },
                  ]}
                  title="Energy Consumption by Building"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Charts */}
          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gauge Chart</CardTitle>
                <CardDescription>
                  Single KPI visualization with thresholds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <GaugeChart
                    value={72.5}
                    title="Temperature"
                    unit="°C"
                    thresholds={{ low: 20, medium: 50, high: 80 }}
                  />
                  <GaugeChart
                    value={45}
                    title="Humidity"
                    unit="%"
                    min={0}
                    max={100}
                    thresholds={{ low: 30, medium: 60, high: 80 }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Radar Chart</CardTitle>
                <CardDescription>
                  Multi-dimensional comparison on polar coordinates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadarChart
                  indicators={[
                    { name: 'Temperature', max: 100 },
                    { name: 'Humidity', max: 100 },
                    { name: 'Pressure', max: 100 },
                    { name: 'Light', max: 100 },
                    { name: 'Air Quality', max: 100 },
                  ]}
                  data={[
                    { value: [85, 72, 68, 90, 75], name: 'Sensor A' },
                    { value: [65, 82, 75, 70, 85], name: 'Sensor B' },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Funnel Chart</CardTitle>
                <CardDescription>
                  Progressive reduction of data through stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FunnelChart
                  data={[
                    { value: 100, name: 'Total Readings' },
                    { value: 85, name: 'Valid Readings' },
                    { value: 70, name: 'Processed' },
                    { value: 50, name: 'Analyzed' },
                    { value: 35, name: 'Actionable' },
                  ]}
                  title="Data Processing Pipeline"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flow Charts */}
          <TabsContent value="flow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sankey Diagram</CardTitle>
                <CardDescription>
                  Flow visualization showing relationships between nodes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SankeyDiagram
                  nodes={[
                    { name: 'Solar' },
                    { name: 'Wind' },
                    { name: 'Grid' },
                    { name: 'Building A' },
                    { name: 'Building B' },
                    { name: 'Storage' },
                  ]}
                  links={[
                    { source: 'Solar', target: 'Building A', value: 45 },
                    { source: 'Solar', target: 'Storage', value: 15 },
                    { source: 'Wind', target: 'Building B', value: 30 },
                    { source: 'Wind', target: 'Storage', value: 10 },
                    { source: 'Grid', target: 'Building A', value: 25 },
                    { source: 'Grid', target: 'Building B', value: 35 },
                    { source: 'Storage', target: 'Building A', value: 10 },
                    { source: 'Storage', target: 'Building B', value: 15 },
                  ]}
                />
              </CardContent>
            </Card>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Chart Selection Guide</h3>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="font-medium mb-2">Time-Series Data</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Line Chart: Continuous trends</li>
                    <li>• Area Chart: Magnitude emphasis</li>
                    <li>• Bar Chart: Discrete intervals</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Correlations</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Scatter Plot: 2-variable relationships</li>
                    <li>• Heatmap: 2D intensity patterns</li>
                    <li>• Boxplot: Statistical distributions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Proportions</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Pie/Donut: Part-to-whole</li>
                    <li>• Treemap: Hierarchical proportions</li>
                    <li>• Funnel: Sequential stages</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">KPIs & Monitoring</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Gauge: Single value thresholds</li>
                    <li>• Radar: Multi-dimensional metrics</li>
                    <li>• Sankey: Flow visualization</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
