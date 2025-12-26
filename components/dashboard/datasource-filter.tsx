'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Database, X } from 'lucide-react';
import { useDashboardStore } from '@/lib/stores/dashboard-store';

interface DataSource {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export function DataSourceFilter() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedDataSourceIds, setSelectedDataSourceIds } = useDashboardStore();

  useEffect(() => {
    loadDataSources();
  }, []);

  const loadDataSources = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/data-sources');
      if (response.ok) {
        const data = await response.json();
        setDataSources(data);
      }
    } catch (error) {
      console.error('Failed to load data sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDataSource = (id: string) => {
    const newSelection = selectedDataSourceIds.includes(id)
      ? selectedDataSourceIds.filter((dsId) => dsId !== id)
      : [...selectedDataSourceIds, id];
    setSelectedDataSourceIds(newSelection);
  };

  const clearAllFilters = () => {
    setSelectedDataSourceIds([]);
  };

  const selectAllDataSources = () => {
    setSelectedDataSourceIds(dataSources.map((ds) => ds.id));
  };

  const selectedCount = selectedDataSourceIds.length;
  const totalCount = dataSources.length;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Database className="h-4 w-4" />
            Data Sources
            {selectedCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Filter by Data Source</span>
            {selectedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={clearAllFilters}
              >
                Clear
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading data sources...
            </div>
          ) : dataSources.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No data sources found
            </div>
          ) : (
            <>
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={selectAllDataSources}
                >
                  Select All ({totalCount})
                </Button>
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-y-auto">
                {dataSources.map((ds) => (
                  <DropdownMenuCheckboxItem
                    key={ds.id}
                    checked={selectedDataSourceIds.includes(ds.id)}
                    onCheckedChange={() => toggleDataSource(ds.id)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{ds.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {ds.type}
                        {!ds.is_active && ' (inactive)'}
                      </span>
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {dataSources
            .filter((ds) => selectedDataSourceIds.includes(ds.id))
            .slice(0, 3)
            .map((ds) => (
              <Badge
                key={ds.id}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-secondary/80"
                onClick={() => toggleDataSource(ds.id)}
              >
                {ds.name}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          {selectedCount > 3 && (
            <Badge variant="secondary">+{selectedCount - 3} more</Badge>
          )}
        </div>
      )}
    </div>
  );
}
