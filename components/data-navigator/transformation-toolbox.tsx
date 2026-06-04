import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Database,
  Filter,
  Combine,
  BarChart3,
  Columns,
  FileOutput,
  Type,
  ArrowRightLeft,
  SortAsc,
  Split,
  Merge,
  Calculator,
} from 'lucide-react';

interface Transformation {
  type: string;
  label: string;
  description: string;
  icon: any;
  category: string;
}

const transformations: Transformation[] = [
  {
    type: 'source',
    label: 'Datenquelle',
    description: 'Lädt Daten aus einer Tabelle oder Abfrage',
    icon: Database,
    category: 'Input/Output',
  },
  {
    type: 'filter',
    label: 'Filtern',
    description: 'Filtert Zeilen basierend auf Bedingungen',
    icon: Filter,
    category: 'Daten filtern',
  },
  {
    type: 'select',
    label: 'Spalten auswählen',
    description: 'Wählt spezifische Spalten aus',
    icon: Columns,
    category: 'Spalten',
  },
  {
    type: 'rename',
    label: 'Umbenennen',
    description: 'Benennt Spalten um',
    icon: Type,
    category: 'Spalten',
  },
  {
    type: 'cast',
    label: 'Datentyp ändern',
    description: 'Konvertiert Spalten zu anderen Datentypen',
    icon: ArrowRightLeft,
    category: 'Spalten',
  },
  {
    type: 'join',
    label: 'Verknüpfen (Join)',
    description: 'Verknüpft Daten aus mehreren Tabellen',
    icon: Combine,
    category: 'Daten kombinieren',
  },
  {
    type: 'union',
    label: 'Vereinigen (Union)',
    description: 'Fügt Zeilen aus mehreren Quellen zusammen',
    icon: Merge,
    category: 'Daten kombinieren',
  },
  {
    type: 'aggregate',
    label: 'Aggregieren',
    description: 'Gruppiert und aggregiert Daten (SUM, AVG, COUNT)',
    icon: BarChart3,
    category: 'Berechnungen',
  },
  {
    type: 'calculate',
    label: 'Berechnen',
    description: 'Erstellt berechnete Spalten mit Formeln',
    icon: Calculator,
    category: 'Berechnungen',
  },
  {
    type: 'sort',
    label: 'Sortieren',
    description: 'Sortiert Zeilen nach Spalten',
    icon: SortAsc,
    category: 'Anordnen',
  },
  {
    type: 'split',
    label: 'Aufteilen',
    description: 'Teilt eine Spalte in mehrere auf',
    icon: Split,
    category: 'Spalten',
  },
  {
    type: 'output',
    label: 'Ausgabe',
    description: 'Schreibt Daten in eine Zieltabelle',
    icon: FileOutput,
    category: 'Input/Output',
  },
];

interface TransformationToolboxProps {
  onAdd: (type: string, label: string) => void;
}

export function TransformationToolbox({ onAdd }: TransformationToolboxProps) {
  const categories = Array.from(new Set(transformations.map((t) => t.category)));

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category}>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {transformations
              .filter((t) => t.category === category)
              .map((transform) => {
                const Icon = transform.icon;
                return (
                  <Card
                    key={transform.type}
                    className="p-4 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => onAdd(transform.type, transform.label)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-500/20 p-2 rounded">
                        <Icon className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm mb-1">{transform.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {transform.description}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      ))}

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Klicken Sie auf eine Transformation, um sie zur Pipeline hinzuzufügen
        </p>
      </div>
    </div>
  );
}
