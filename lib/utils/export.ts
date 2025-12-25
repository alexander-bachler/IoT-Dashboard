/**
 * Data Export Utilities
 * Export time-series data to various formats (CSV, JSON)
 */

interface DataPoint {
  time: string | Date;
  value: number;
  [key: string]: unknown;
}

interface Series {
  metricName: string;
  metricUnit?: string;
  data: DataPoint[];
}

/**
 * Export data to CSV format
 */
export function exportToCSV(series: Series[]): string {
  if (series.length === 0) {
    return '';
  }

  // Create header row
  const headers = ['Timestamp'];
  series.forEach((s) => {
    const header = s.metricUnit ? `${s.metricName} (${s.metricUnit})` : s.metricName;
    headers.push(header);
  });

  // Get all unique timestamps
  const timestampSet = new Set<string>();
  series.forEach((s) => {
    s.data.forEach((d) => {
      timestampSet.add(new Date(d.time).toISOString());
    });
  });

  const timestamps = Array.from(timestampSet).sort();

  // Create data rows
  const rows: string[][] = [headers];

  timestamps.forEach((timestamp) => {
    const row: string[] = [timestamp];

    series.forEach((s) => {
      const dataPoint = s.data.find(
        (d) => new Date(d.time).toISOString() === timestamp
      );
      row.push(dataPoint ? dataPoint.value.toString() : '');
    });

    rows.push(row);
  });

  // Convert to CSV string
  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

/**
 * Export data to JSON format
 */
export function exportToJSON(series: Series[]): string {
  const exportData = series.map((s) => ({
    metric: s.metricName,
    unit: s.metricUnit,
    data: s.data.map((d) => ({
      timestamp: new Date(d.time).toISOString(),
      value: d.value,
    })),
  }));

  return JSON.stringify(exportData, null, 2);
}

/**
 * Trigger browser download of data
 */
export function downloadData(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export and download data as CSV
 */
export function downloadCSV(series: Series[], filename?: string): void {
  const csv = exportToCSV(series);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const finalFilename = filename || `iot-data-${timestamp}.csv`;
  downloadData(csv, finalFilename, 'text/csv');
}

/**
 * Export and download data as JSON
 */
export function downloadJSON(series: Series[], filename?: string): void {
  const json = exportToJSON(series);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const finalFilename = filename || `iot-data-${timestamp}.json`;
  downloadData(json, finalFilename, 'application/json');
}

/**
 * Calculate statistics for a series
 */
export function calculateStatistics(data: DataPoint[]) {
  if (data.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      avg: 0,
      sum: 0,
    };
  }

  const values = data.map((d) => d.value);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    count: values.length,
    min,
    max,
    avg,
    sum,
  };
}

/**
 * Export statistics summary
 */
export function exportStatisticsSummary(series: Series[]): string {
  const summary = series.map((s) => {
    const stats = calculateStatistics(s.data);
    return {
      metric: s.metricName,
      unit: s.metricUnit,
      ...stats,
    };
  });

  // CSV format
  const headers = ['Metric', 'Unit', 'Count', 'Min', 'Max', 'Average', 'Sum'];
  const rows = [headers];

  summary.forEach((s) => {
    rows.push([
      s.metric,
      s.unit || '',
      s.count.toString(),
      s.min.toFixed(2),
      s.max.toFixed(2),
      s.avg.toFixed(2),
      s.sum.toFixed(2),
    ]);
  });

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

/**
 * Download statistics summary as CSV
 */
export function downloadStatisticsSummary(series: Series[], filename?: string): void {
  const csv = exportStatisticsSummary(series);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const finalFilename = filename || `iot-statistics-${timestamp}.csv`;
  downloadData(csv, finalFilename, 'text/csv');
}
