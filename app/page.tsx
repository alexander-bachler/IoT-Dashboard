'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Database,
  LineChart,
  LayoutDashboard,
  AlertTriangle,
  Activity,
  TrendingUp,
  Zap,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { useDataSources } from '@/lib/hooks/use-data-sources';
import { useRecentAnomalies } from '@/lib/hooks/use-anomalies';
import { MetricCardSkeleton } from '@/components/ui/skeleton-loader';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useSession } from 'next-auth/react';

function LiveStatsCards() {
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const { data: dataSources, isLoading: sourcesLoading, error: sourcesError } = useDataSources(
    { page: 1, page_size: 100 },
    { enabled: isAuthenticated && mounted }
  );
  const { data: recentAnomalies, isLoading: anomaliesLoading, error: anomaliesError } = useRecentAnomalies(
    10,
    { enabled: isAuthenticated && mounted }
  );

  // Show skeleton during SSR and initial client render
  if (!mounted || status === 'loading') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="glass-card p-8 mb-12 text-center">
        <LogIn className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Sign in to view live stats</h3>
        <p className="text-muted-foreground mb-4">Connect your data sources and monitor your IoT devices in real-time</p>
        <Link href="/auth/signin">
          <Button size="lg" className="gap-2">
            Sign In
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  if (sourcesLoading || anomaliesLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    );
  }

  const dataSourcesList = dataSources?.data || [];
  const totalSources = dataSources?.total || 0;
  const activeSources = dataSourcesList.filter((s) => s.status === 'active').length;
  const totalDevices = dataSourcesList.reduce((acc, s) => acc + (s.device_count || 0), 0);
  const criticalAnomalies = recentAnomalies?.filter((a) => a.severity === 'critical').length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
      <div className="metric-card hover-scale group">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
            <Database className="h-5 w-5 text-blue-500" />
          </div>
          <Badge variant="outline" className="text-xs">
            {activeSources} active
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground mb-1">Data Sources</div>
        <div className="text-3xl font-bold gradient-text">{totalSources}</div>
      </div>

      <div className="metric-card hover-scale group">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
            <Activity className="h-5 w-5 text-green-500" />
          </div>
          <Badge variant="outline" className="text-xs">
            Connected
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground mb-1">Total Devices</div>
        <div className="text-3xl font-bold gradient-text">{totalDevices}</div>
      </div>

      <div className="metric-card hover-scale group">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <Badge variant="outline" className={criticalAnomalies > 0 ? 'text-red-500' : 'text-xs'}>
            {criticalAnomalies > 0 ? `${criticalAnomalies} critical` : 'All good'}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground mb-1">Recent Anomalies</div>
        <div className="text-3xl font-bold gradient-text">{recentAnomalies?.length || 0}</div>
      </div>

      <div className="metric-card hover-scale group">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
            <Zap className="h-5 w-5 text-purple-500" />
          </div>
          <Badge variant="outline" className="text-xs">
            v2.3.1
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground mb-1">Platform Status</div>
        <div className="text-lg font-bold text-green-500">● Online</div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-8 animate-fade-in">
        {/* Gradient orbs for depth */}
        <div className="absolute -top-4 -left-4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

        {/* Hero Section */}
        <div className="relative text-center py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-600/10 border border-blue-500/20 mb-6">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Enterprise IoT Analytics Platform</span>
          </div>

          <h1 className="text-5xl font-bold mb-4 gradient-text">
            IoT Time-Series Analytics
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional data visualization and analytics for IoT and industrial applications
          </p>
        </div>

        {/* Live Stats */}
        <LiveStatsCards />

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="glass-card hover-scale group">
            <CardHeader>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-600/20 w-fit mb-4 group-hover:scale-110 transition-transform">
                <Database className="h-8 w-8 text-blue-500" />
              </div>
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>
                Connect and manage your IoT data sources with real-time synchronization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/data-sources">
                <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                  Manage Sources
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card hover-scale group">
            <CardHeader>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 w-fit mb-4 group-hover:scale-110 transition-transform">
                <LineChart className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle>Data Explorer</CardTitle>
              <CardDescription>
                Analyze and visualize your time-series data with advanced charts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/explorer">
                <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                  Explore Data
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card hover-scale group">
            <CardHeader>
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-600/20 w-fit mb-4 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="h-8 w-8 text-purple-500" />
              </div>
              <CardTitle>Dashboards</CardTitle>
              <CardDescription>
                Create custom dashboards with drag-and-drop widgets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboards">
                <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                  View Dashboards
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card hover-scale group">
            <CardHeader>
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-600/20 w-fit mb-4 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
              <CardTitle>Anomaly Detection</CardTitle>
              <CardDescription>
                AI-powered anomaly detection for your IoT data streams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/anomalies">
                <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                  View Anomalies
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card hover-scale group">
            <CardHeader>
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 w-fit mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-8 w-8 text-cyan-500" />
              </div>
              <CardTitle>Chart Gallery</CardTitle>
              <CardDescription>
                Explore 12+ chart types for comprehensive data visualization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/charts">
                <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                  View Charts
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card hover-scale group">
            <CardHeader>
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 w-fit mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-8 w-8 text-indigo-500" />
              </div>
              <CardTitle>Data Navigator</CardTitle>
              <CardDescription>
                Visual ETL designer and schema explorer for data transformation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/data-navigator">
                <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                  Open Navigator
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-2xl">Getting Started</CardTitle>
            <CardDescription>Follow these steps to set up your IoT analytics platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4 group">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold text-lg group-hover:scale-110 transition-transform">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-lg">Connect Data Sources</h3>
                <p className="text-muted-foreground">
                  Add your LineMetrics, MQTT brokers, or other IoT data sources to start collecting data
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold text-lg group-hover:scale-110 transition-transform">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-lg">Sync Metadata & Data</h3>
                <p className="text-muted-foreground">
                  Import devices, metrics, and historical measurements from your connected sources
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold text-lg group-hover:scale-110 transition-transform">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-lg">Visualize & Analyze</h3>
                <p className="text-muted-foreground">
                  Use the Data Explorer, create custom dashboards, or set up anomaly detection rules
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
