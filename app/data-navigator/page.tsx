'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SchemaViewer } from '@/components/data-navigator/schema-viewer';
import { ETLDesigner } from '@/components/data-navigator/etl-designer';
import { MetadataEditor } from '@/components/data-navigator/metadata-editor';
import { Database, Workflow, Settings, Sparkles } from 'lucide-react';

export default function DataNavigatorPage() {
  const [activeTab, setActiveTab] = useState('schema');

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative data-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="section-header mb-0">Data Navigator</h1>
          </div>
          <p className="text-muted-foreground">
            Visualisieren Sie Datenbeziehungen, designen Sie ETL-Prozesse und bearbeiten Sie Metadaten
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 h-auto p-1 glass-card">
          <TabsTrigger
            value="schema"
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-600/20 data-[state=active]:shadow-glow-sm py-3"
          >
            <Database className="h-4 w-4" />
            <span>Schema</span>
          </TabsTrigger>
          <TabsTrigger
            value="etl"
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-600/20 data-[state=active]:shadow-glow-sm py-3"
          >
            <Workflow className="h-4 w-4" />
            <span>ETL Designer</span>
          </TabsTrigger>
          <TabsTrigger
            value="metadata"
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-600/20 data-[state=active]:shadow-glow-sm py-3"
          >
            <Settings className="h-4 w-4" />
            <span>Metadaten</span>
          </TabsTrigger>
        </TabsList>

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
