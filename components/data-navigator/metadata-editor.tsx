'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  Edit,
  Save,
  X,
  Info,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

interface Column {
  name: string;
  original_name: string;
  data_type: string;
  original_data_type: string;
  nullable: boolean;
  description: string;
  display_name: string;
  format?: string;
  default_value?: string;
  is_modified: boolean;
}

interface TableMetadata {
  name: string;
  display_name: string;
  description: string;
  schema: string;
  column_count?: number;
  columns: Column[];
}

const dataTypes = [
  'TEXT',
  'INTEGER',
  'BIGINT',
  'DOUBLE PRECISION',
  'NUMERIC',
  'BOOLEAN',
  'TIMESTAMP',
  'TIMESTAMPTZ',
  'DATE',
  'UUID',
  'JSONB',
  'VARCHAR',
];

export function MetadataEditor() {
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableMetadata | null>(null);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingColumns, setLoadingColumns] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/schema/tables');
      const data = response.data;
      const tablesData = data.map((table: any) => ({
        name: table.name,
        display_name: table.display_name,
        description: table.description,
        schema: table.schema || 'public',
        column_count: table.column_count,
        columns: [],
      }));

      setTables(tablesData);

      // Load first table's columns automatically
      if (tablesData.length > 0) {
        loadTableColumns(tablesData[0].name, tablesData);
      }
    } catch (error: any) {
      console.error('Failed to load tables:', error);
      toast.error(error.response?.data?.detail || 'Fehler beim Laden der Tabellen');
    } finally {
      setLoading(false);
    }
  };

  const loadTableColumns = async (tableName: string, existingTables?: TableMetadata[]) => {
    setLoadingColumns(true);
    try {
      const response = await apiClient.get(`/api/v1/schema/tables/${tableName}/columns`);
      const columns = response.data;

      const table: TableMetadata = {
        name: tableName,
        display_name: (existingTables || tables).find((t) => t.name === tableName)?.display_name || tableName,
        description: (existingTables || tables).find((t) => t.name === tableName)?.description || '',
        schema: 'public',
        columns: columns,
      };

      setSelectedTable(table);

      // Update tables array
      const tablesList = existingTables || tables;
      setTables(tablesList.map((t) => (t.name === tableName ? table : t)));
    } catch (error: any) {
      console.error('Failed to load columns:', error);
      toast.error(error.response?.data?.detail || 'Fehler beim Laden der Spalten');
    } finally {
      setLoadingColumns(false);
    }
  };

  const handleTableChange = async (tableName: string) => {
    const table = tables.find((t) => t.name === tableName);
    if (table) {
      if (table.columns.length === 0) {
        await loadTableColumns(tableName);
      } else {
        setSelectedTable(table);
      }
    }
  };

  const handleUpdateColumn = (columnName: string, field: keyof Column, value: any) => {
    if (!selectedTable) return;

    setSelectedTable((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map((col) =>
          col.name === columnName ? { ...col, [field]: value, is_modified: true } : col
        ),
      };
    });
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    if (!selectedTable) return;

    setTables((prev) =>
      prev.map((t) => (t.name === selectedTable.name ? selectedTable : t))
    );
    setHasChanges(false);
    toast.success('Änderungen lokal gespeichert!');
  };

  const handleDiscardChanges = () => {
    if (!selectedTable) return;

    const original = tables.find((t) => t.name === selectedTable.name);
    if (original) {
      setSelectedTable(original);
      setHasChanges(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Keine Tabellen gefunden</p>
      </div>
    );
  }

  if (!selectedTable) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="success-banner">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Info className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Metadaten-Editor</h3>
            <p className="text-sm text-muted-foreground">
              Bearbeiten Sie Spalten-Metadaten: Bezeichnungen, Datentypen, Beschreibungen und Formate.
              Änderungen werden lokal gespeichert und in der Anwendung angezeigt.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 items-center justify-between">
        <Select value={selectedTable.name} onValueChange={handleTableChange}>
          <SelectTrigger className="w-[300px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tables.map((table) => (
              <SelectItem key={table.name} value={table.name}>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  {table.display_name} ({table.name})
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {hasChanges && (
            <>
              <Button variant="outline" onClick={handleDiscardChanges} className="gap-2">
                <X className="h-4 w-4" />
                Verwerfen
              </Button>
              <Button onClick={handleSaveChanges} className="gap-2">
                <Save className="h-4 w-4" />
                Speichern
              </Button>
            </>
          )}
        </div>
      </div>

      {hasChanges && (
        <div className="warning-banner">
          <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-4 w-4" />
            Sie haben ungespeicherte Änderungen
          </div>
        </div>
      )}

      <Card>
        <div className="p-6 border-b">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Tabellenname</Label>
              <Input value={selectedTable.name} disabled className="mt-2" />
            </div>
            <div>
              <Label>Anzeigename</Label>
              <Input
                value={selectedTable.display_name}
                onChange={(e) =>
                  setSelectedTable({ ...selectedTable, display_name: e.target.value })
                }
                className="mt-2"
              />
            </div>
            <div className="col-span-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={selectedTable.description}
                onChange={(e) =>
                  setSelectedTable({ ...selectedTable, description: e.target.value })
                }
                className="mt-2"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="font-semibold mb-4">
            Spalten ({selectedTable.columns.length})
            {loadingColumns && <Loader2 className="h-4 w-4 animate-spin inline ml-2" />}
          </h3>

          {loadingColumns ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spaltenname</TableHead>
                  <TableHead>Anzeigename</TableHead>
                  <TableHead>Datentyp</TableHead>
                  <TableHead>Nullable</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead className="w-[100px]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedTable.columns.map((column) => (
                  <TableRow key={column.name}>
                    <TableCell className="font-mono text-sm">
                      {column.name}
                      {column.is_modified && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Geändert
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={column.display_name}
                        onChange={(e) =>
                          handleUpdateColumn(column.name, 'display_name', e.target.value)
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={column.data_type}
                        onValueChange={(value) =>
                          handleUpdateColumn(column.name, 'data_type', value)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dataTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={column.nullable}
                        onChange={(e) =>
                          handleUpdateColumn(column.name, 'nullable', e.target.checked)
                        }
                        className="h-4 w-4"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={column.format || ''}
                        onChange={(e) =>
                          handleUpdateColumn(column.name, 'format', e.target.value)
                        }
                        placeholder="z.B. 0.00"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={column.description}
                        onChange={(e) =>
                          handleUpdateColumn(column.name, 'description', e.target.value)
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingColumn(column)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Spalte bearbeiten: {column.name}</DialogTitle>
                            <DialogDescription>
                              Erweiterte Metadaten-Bearbeitung
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Standardwert</Label>
                              <Input
                                value={column.default_value || ''}
                                onChange={(e) =>
                                  handleUpdateColumn(column.name, 'default_value', e.target.value)
                                }
                                className="mt-2"
                              />
                            </div>
                            <div>
                              <Label>Formatvorlage</Label>
                              <Select
                                value={column.format || 'none'}
                                onValueChange={(value) =>
                                  handleUpdateColumn(
                                    column.name,
                                    'format',
                                    value === 'none' ? '' : value
                                  )
                                }
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Keine</SelectItem>
                                  <SelectItem value="0.00">Dezimal (0.00)</SelectItem>
                                  <SelectItem value="0,0">Tausendertrennzeichen</SelectItem>
                                  <SelectItem value="DD.MM.YYYY">Datum (DD.MM.YYYY)</SelectItem>
                                  <SelectItem value="HH:mm:ss">Zeit (HH:mm:ss)</SelectItem>
                                  <SelectItem value="0%">Prozent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={() => setEditingColumn(null)}>Schließen</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card hover-scale">
          <div className="text-sm text-muted-foreground mb-1">Spalten gesamt</div>
          <div className="text-3xl font-bold gradient-text">{selectedTable.columns.length}</div>
        </div>
        <div className="metric-card hover-scale">
          <div className="text-sm text-muted-foreground mb-1">Geänderte Felder</div>
          <div className="text-3xl font-bold gradient-text">
            {selectedTable.columns.filter((c) => c.is_modified).length}
          </div>
        </div>
        <div className="metric-card hover-scale">
          <div className="text-sm text-muted-foreground mb-1">Nullable Spalten</div>
          <div className="text-3xl font-bold gradient-text">
            {selectedTable.columns.filter((c) => c.nullable).length}
          </div>
        </div>
      </div>
    </div>
  );
}
