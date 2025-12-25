'use client';

import { useState } from 'react';
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
  Plus,
  Trash2,
  Info,
  Check,
  AlertCircle,
} from 'lucide-react';

interface Column {
  name: string;
  originalName: string;
  dataType: string;
  originalDataType: string;
  nullable: boolean;
  description: string;
  displayName: string;
  format?: string;
  defaultValue?: string;
  isModified: boolean;
}

interface TableMetadata {
  name: string;
  displayName: string;
  description: string;
  schema: string;
  columns: Column[];
}

const mockTables: TableMetadata[] = [
  {
    name: 'measurements',
    displayName: 'Messwerte',
    description: 'Zeitreihen-Messdaten von IoT-Geräten',
    schema: 'public',
    columns: [
      {
        name: 'time',
        originalName: 'time',
        dataType: 'TIMESTAMPTZ',
        originalDataType: 'TIMESTAMPTZ',
        nullable: false,
        description: 'Zeitstempel der Messung',
        displayName: 'Zeitpunkt',
        isModified: false,
      },
      {
        name: 'metric_id',
        originalName: 'metric_id',
        dataType: 'UUID',
        originalDataType: 'UUID',
        nullable: false,
        description: 'Referenz zur Metrik',
        displayName: 'Metrik-ID',
        isModified: false,
      },
      {
        name: 'value',
        originalName: 'value',
        dataType: 'DOUBLE PRECISION',
        originalDataType: 'DOUBLE PRECISION',
        nullable: false,
        description: 'Gemessener Wert',
        displayName: 'Messwert',
        format: '0.00',
        isModified: false,
      },
      {
        name: 'quality',
        originalName: 'quality',
        dataType: 'INTEGER',
        originalDataType: 'INTEGER',
        nullable: true,
        description: 'Qualitätsindikator (0-100)',
        displayName: 'Qualität',
        isModified: false,
      },
    ],
  },
  {
    name: 'devices',
    displayName: 'Geräte',
    description: 'IoT-Geräte und Sensoren',
    schema: 'public',
    columns: [
      {
        name: 'id',
        originalName: 'id',
        dataType: 'UUID',
        originalDataType: 'UUID',
        nullable: false,
        description: 'Eindeutige Geräte-ID',
        displayName: 'ID',
        isModified: false,
      },
      {
        name: 'name',
        originalName: 'name',
        dataType: 'TEXT',
        originalDataType: 'TEXT',
        nullable: false,
        description: 'Gerätename',
        displayName: 'Gerätename',
        isModified: false,
      },
      {
        name: 'location',
        originalName: 'location',
        dataType: 'TEXT',
        originalDataType: 'TEXT',
        nullable: true,
        description: 'Standort des Geräts',
        displayName: 'Standort',
        isModified: false,
      },
    ],
  },
];

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
];

export function MetadataEditor() {
  const [tables, setTables] = useState<TableMetadata[]>(mockTables);
  const [selectedTable, setSelectedTable] = useState<TableMetadata>(mockTables[0]);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const handleUpdateColumn = (columnName: string, field: keyof Column, value: any) => {
    setSelectedTable((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.name === columnName ? { ...col, [field]: value, isModified: true } : col
      ),
    }));
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    setTables((prev) =>
      prev.map((t) => (t.name === selectedTable.name ? selectedTable : t))
    );
    setHasChanges(false);
    alert('Änderungen gespeichert!');
  };

  const handleDiscardChanges = () => {
    const original = tables.find((t) => t.name === selectedTable.name);
    if (original) {
      setSelectedTable(original);
      setHasChanges(false);
    }
  };

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
              Änderungen werden in der Anwendung sichtbar, nicht in der physischen Datenbank.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 items-center justify-between">
        <Select
          value={selectedTable.name}
          onValueChange={(value) => {
            const table = tables.find((t) => t.name === value);
            if (table) setSelectedTable(table);
          }}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tables.map((table) => (
              <SelectItem key={table.name} value={table.name}>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  {table.displayName} ({table.name})
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
                value={selectedTable.displayName}
                onChange={(e) =>
                  setSelectedTable({ ...selectedTable, displayName: e.target.value })
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
          <h3 className="font-semibold mb-4">Spalten ({selectedTable.columns.length})</h3>

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
                    {column.isModified && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Geändert
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={column.displayName}
                      onChange={(e) =>
                        handleUpdateColumn(column.name, 'displayName', e.target.value)
                      }
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={column.dataType}
                      onValueChange={(value) =>
                        handleUpdateColumn(column.name, 'dataType', value)
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
                              value={column.defaultValue || ''}
                              onChange={(e) =>
                                handleUpdateColumn(column.name, 'defaultValue', e.target.value)
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
            {selectedTable.columns.filter((c) => c.isModified).length}
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
