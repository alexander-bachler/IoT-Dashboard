'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SchemaViewer } from '@/components/data-navigator/schema-viewer';
import { ETLDesigner } from '@/components/data-navigator/etl-designer';
import { MetadataEditor } from '@/components/data-navigator/metadata-editor';
import { DataSourceManager } from '@/components/data-navigator/datasource-manager';
import { Database, Workflow, Settings, Sparkles, Server } from 'lucide-react';

export default function DataNavigatorPage() {
  const [activeTab, setActiveTab] = useState('datasources');

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="relative">
        <div className="data-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="section-header mb-0">Data Navigator</h1>
          </div>
          <p className="text-muted-foreground">
            Verwalten Sie Datenquellen, visualisieren Sie Beziehungen, designen Sie ETL-Prozesse und bearbeiten Sie Metadaten
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-4 h-auto p-1 glass-card">
          <TabsTrigger
            value="datasources"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm py-3"
          >
            <Server className="h-4 w-4" />
            <span>Data Sources</span>
          </TabsTrigger>
          <TabsTrigger
            value="schema"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm py-3"
          >
            <Database className="h-4 w-4" />
            <span>Schema</span>
          </TabsTrigger>
          <TabsTrigger
            value="etl"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm py-3"
          >
            <Workflow className="h-4 w-4" />
            <span>ETL Designer</span>
          </TabsTrigger>
          <TabsTrigger
            value="metadata"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm py-3"
          >
            <Settings className="h-4 w-4" />
            <span>Metadaten</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datasources" className="mt-6 animate-slide-up">
          <DataSourceManager />
        </TabsContent>

        <TabsContent value="schema" className="mt-6 animate-slide-up">
          <SchemaViewer />
        </TabsContent>

        <TabsContent value="etl" className="mt-6 animate-slide-up">
          <ETLDesigner />
        </TabsContent>

        <TabsContent value="metadata" className="mt-6 animate-slide-up">
          <MetadataEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
