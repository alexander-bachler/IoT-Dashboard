'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CheckCircle2, AlertCircle, XCircle, Info } from 'lucide-react';
import { calculateDataQuality } from '@/lib/services/anomaly-detection';

interface DataQualityBadgeProps {
  data: Array<{ time: string; value: number }>;
  expectedInterval?: number; // in milliseconds
}

export function DataQualityBadge({ data, expectedInterval = 60000 }: DataQualityBadgeProps) {
  const [quality, setQuality] = useState<any>(null);

  useEffect(() => {
    if (data.length === 0) {
      setQuality(null);
      return;
    }

    // Pure client-side computation (no backend round-trip needed)
    try {
      setQuality(calculateDataQuality(data, expectedInterval));
    } catch (error) {
      console.error('Error calculating quality:', error);
      setQuality(null);
    }
  }, [data, expectedInterval]);

  if (!quality) {
    return null;
  }

  const getQualityLevel = (completeness: number) => {
    if (completeness >= 95) return 'excellent';
    if (completeness >= 85) return 'good';
    if (completeness >= 70) return 'fair';
    return 'poor';
  };

  const getQualityColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100';
      case 'good':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-100';
      default:
        return 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100';
    }
  };

  const getQualityIcon = (level: string) => {
    switch (level) {
      case 'excellent':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'good':
        return <Info className="h-4 w-4" />;
      case 'fair':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const level = getQualityLevel(quality.completeness);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge className={`cursor-pointer flex items-center gap-1.5 ${getQualityColor(level)}`}>
          {getQualityIcon(level)}
          <span>Quality: {quality.completeness.toFixed(1)}%</span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold mb-2">Data Quality Metrics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completeness:</span>
                <span className="font-medium">{quality.completeness.toFixed(2)}%</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Data Points:</span>
                <span className="font-medium">
                  {quality.actualCount} / {quality.expectedCount}
                </span>
              </div>

              {quality.missingCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Missing:</span>
                  <span className="font-medium text-red-600">{quality.missingCount}</span>
                </div>
              )}

              {quality.duplicateCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duplicates:</span>
                  <span className="font-medium text-yellow-600">{quality.duplicateCount}</span>
                </div>
              )}

              {quality.outOfOrderCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Out of Order:</span>
                  <span className="font-medium text-orange-600">{quality.outOfOrderCount}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t text-xs text-muted-foreground">
            <p>Data quality is calculated based on expected vs actual data points.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
