import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Database, LineChart, LayoutDashboard } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            IoT Time-Series Analytics Platform
          </h1>
          <p className="text-xl text-muted-foreground">
            Professional data visualization for IoT and industrial applications
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <Database className="h-12 w-12 mb-4 text-primary" />
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>
                Connect and manage your IoT data sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/data-sources">
                <Button className="w-full">Manage Sources</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <LineChart className="h-12 w-12 mb-4 text-primary" />
              <CardTitle>Data Explorer</CardTitle>
              <CardDescription>
                Analyze and visualize your time-series data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/explorer">
                <Button className="w-full">Explore Data</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <LayoutDashboard className="h-12 w-12 mb-4 text-primary" />
              <CardTitle>Dashboards</CardTitle>
              <CardDescription>
                Create custom dashboards with widgets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboards">
                <Button className="w-full">View Dashboards</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Connect Data Sources</h3>
                  <p className="text-muted-foreground">
                    Add your LineMetrics or other IoT data sources
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Sync Metadata & Data</h3>
                  <p className="text-muted-foreground">
                    Import devices, metrics, and historical measurements
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Visualize & Analyze</h3>
                  <p className="text-muted-foreground">
                    Use the Data Explorer or create custom dashboards
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
