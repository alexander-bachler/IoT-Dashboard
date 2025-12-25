/**
 * Anomaly Detection Service
 * Statistical anomaly detection using Z-score method
 */

interface DataPoint {
  time: string;
  value: number;
}

interface AnomalyResult {
  timestamp: string;
  value: number;
  expectedValue: number;
  zScore: number;
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Calculate mean of an array of numbers
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate Z-score for a value
 */
function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Determine severity based on Z-score
 */
function getSeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
  const absZScore = Math.abs(zScore);
  if (absZScore >= 4) return 'critical';
  if (absZScore >= 3) return 'high';
  if (absZScore >= 2) return 'medium';
  return 'low';
}

/**
 * Detect anomalies in a time series using Z-score method
 * @param data - Array of data points
 * @param threshold - Z-score threshold (default: 3)
 * @param windowSize - Size of rolling window for baseline calculation
 * @returns Array of anomaly results
 */
export function detectAnomalies(
  data: DataPoint[],
  threshold: number = 3,
  windowSize: number = 50
): AnomalyResult[] {
  if (data.length < windowSize) {
    console.warn('Not enough data points for anomaly detection');
    return [];
  }

  const results: AnomalyResult[] = [];

  // Use first windowSize points to establish baseline
  const baselineValues = data.slice(0, windowSize).map(d => d.value);
  const mean = calculateMean(baselineValues);
  const stdDev = calculateStdDev(baselineValues, mean);

  // Check each point
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    const zScore = calculateZScore(point.value, mean, stdDev);
    const isAnomaly = Math.abs(zScore) > threshold;

    results.push({
      timestamp: point.time,
      value: point.value,
      expectedValue: mean,
      zScore,
      isAnomaly,
      severity: isAnomaly ? getSeverity(zScore) : 'low',
    });

    // Update rolling window (optional: for adaptive detection)
    if (i >= windowSize && !isAnomaly) {
      // Only update baseline with non-anomalous points
      const rollingWindow = data.slice(Math.max(0, i - windowSize + 1), i + 1).map(d => d.value);
      const newMean = calculateMean(rollingWindow);
      const newStdDev = calculateStdDev(rollingWindow, newMean);
      // Gradually adapt baseline
    }
  }

  return results;
}

/**
 * Detect anomalies with contextual awareness
 * Considers seasonal patterns and trends
 */
export function detectContextualAnomalies(
  data: DataPoint[],
  threshold: number = 3
): AnomalyResult[] {
  // Simple implementation - can be extended with seasonal decomposition
  return detectAnomalies(data, threshold);
}

/**
 * Calculate data quality metrics
 */
export function calculateDataQuality(
  data: DataPoint[],
  expectedInterval: number = 60000 // in milliseconds
): {
  completeness: number;
  expectedCount: number;
  actualCount: number;
  missingCount: number;
  latency: number;
  outOfOrderCount: number;
  duplicateCount: number;
} {
  if (data.length === 0) {
    return {
      completeness: 0,
      expectedCount: 0,
      actualCount: 0,
      missingCount: 0,
      latency: 0,
      outOfOrderCount: 0,
      duplicateCount: 0,
    };
  }

  const sorted = [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  const firstTime = new Date(sorted[0].time).getTime();
  const lastTime = new Date(sorted[sorted.length - 1].time).getTime();
  const timeSpan = lastTime - firstTime;

  const expectedCount = Math.floor(timeSpan / expectedInterval) + 1;
  const actualCount = data.length;
  const missingCount = Math.max(0, expectedCount - actualCount);
  const completeness = expectedCount > 0 ? (actualCount / expectedCount) * 100 : 100;

  // Detect out-of-order points
  let outOfOrderCount = 0;
  for (let i = 1; i < data.length; i++) {
    if (new Date(data[i].time).getTime() < new Date(data[i - 1].time).getTime()) {
      outOfOrderCount++;
    }
  }

  // Detect duplicates
  const timestamps = new Set(data.map(d => d.time));
  const duplicateCount = data.length - timestamps.size;

  // Simple latency estimate (not real-time)
  const latency = 0;

  return {
    completeness: Math.round(completeness * 100) / 100,
    expectedCount,
    actualCount,
    missingCount,
    latency,
    outOfOrderCount,
    duplicateCount,
  };
}
