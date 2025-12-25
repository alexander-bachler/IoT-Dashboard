'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SchemaViewer } from '@/components/data-navigator/schema-viewer';
import { ETLDesigner } from '@/components/data-navigator/etl-designer';
import { MetadataEditor } from '@/components/data-navigator/metadata-editor';
import { Database, Workflow, Settings } from 'lucide-react';

export default function DataNavigatorPage() {
  const [activeTab, setActiveTab] = useState('schema');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Data Navigator</h1>
        <p className="text-muted-foreground">
          Visualisieren Sie Datenbeziehungen, designen Sie ETL-Prozesse und bearbeiten Sie Metadaten
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="schema" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="etl" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            ETL Designer
          </TabsTrigger>
          <TabsTrigger value="metadata" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Metadaten
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="mt-6">
          <SchemaViewer />
        </TabsContent>

        <TabsContent value="etl" className="mt-6">
          <ETLDesigner />
        </TabsContent>

        <TabsContent value="metadata" className="mt-6">
          <MetadataEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
