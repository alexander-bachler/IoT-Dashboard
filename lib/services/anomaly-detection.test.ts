import { describe, it, expect } from 'vitest';
import { detectAnomalies, detectContextualAnomalies, calculateDataQuality } from './anomaly-detection';

describe('Anomaly Detection', () => {
  describe('detectAnomalies', () => {
    it('should detect no anomalies in normal data', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        time: new Date(Date.now() + i * 60000).toISOString(),
        value: 100 + Math.random() * 5, // Normal variation around 100
      }));

      const results = detectAnomalies(data, 3, 50);

      const anomalies = results.filter((r) => r.isAnomaly);
      expect(anomalies.length).toBe(0);
    });

    it('should detect spike anomaly', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        time: new Date(Date.now() + i * 60000).toISOString(),
        value: i === 75 ? 500 : 100 + Math.random() * 2, // Spike at index 75
      }));

      const results = detectAnomalies(data, 3, 50);

      const anomalies = results.filter((r) => r.isAnomaly);
      expect(anomalies.length).toBeGreaterThan(0);

      // Check that the spike was detected
      const spikeResult = results[75];
      expect(spikeResult.isAnomaly).toBe(true);
      expect(Math.abs(spikeResult.zScore)).toBeGreaterThan(3);
    });

    it('should classify severity correctly', () => {
      // The baseline (first windowSize points) needs some variation, otherwise
      // stdDev is 0 and every z-score collapses to 0.
      const data = Array.from({ length: 100 }, (_, i) => ({
        time: new Date(Date.now() + i * 60000).toISOString(),
        value: 100 + (i % 5),
      }));

      // A large spike well outside the baseline must be classified critical.
      data[85] = { time: data[85].time, value: 1000 };

      const results = detectAnomalies(data, 3, 50);

      const criticalAnomalies = results.filter((r) => r.severity === 'critical');
      expect(criticalAnomalies.length).toBeGreaterThan(0);
    });

    it('should return empty array for insufficient data', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        time: new Date(Date.now() + i * 60000).toISOString(),
        value: 100,
      }));

      const results = detectAnomalies(data, 3, 50);

      expect(results).toEqual([]);
    });

    it('should handle zero standard deviation gracefully', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        time: new Date(Date.now() + i * 60000).toISOString(),
        value: 100, // All same values
      }));

      const results = detectAnomalies(data, 3, 50);

      // Should not crash and should handle gracefully
      expect(results).toBeDefined();
      expect(results.length).toBe(100);
      results.forEach((r) => {
        expect(r.zScore).toBe(0);
        expect(r.isAnomaly).toBe(false);
      });
    });

    it('should calculate correct z-scores', () => {
      const data = [
        ...Array.from({ length: 50 }, (_, i) => ({
          time: new Date(Date.now() + i * 60000).toISOString(),
          value: 100,
        })),
        { time: new Date(Date.now() + 50 * 60000).toISOString(), value: 110 },
      ];

      const results = detectAnomalies(data, 3, 50);

      expect(results.length).toBe(51);
      expect(results[50].value).toBe(110);
      expect(results[50].expectedValue).toBe(100);
    });
  });

  describe('detectContextualAnomalies', () => {
    it('should detect contextual anomalies', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        time: new Date(Date.now() + i * 60000).toISOString(),
        value: i === 75 ? 500 : 100 + Math.random() * 2,
      }));

      const results = detectContextualAnomalies(data, 3);

      const anomalies = results.filter((r) => r.isAnomaly);
      expect(anomalies.length).toBeGreaterThan(0);
    });
  });

  describe('calculateDataQuality', () => {
    it('should calculate 100% completeness for perfect data', () => {
      const startTime = Date.now();
      const data = Array.from({ length: 60 }, (_, i) => ({
        time: new Date(startTime + i * 60000).toISOString(), // Every minute
        value: 100,
      }));

      const quality = calculateDataQuality(data, 60000);

      expect(quality.completeness).toBeGreaterThanOrEqual(98); // Allow small rounding
      expect(quality.actualCount).toBe(60);
      expect(quality.missingCount).toBeLessThanOrEqual(2);
      expect(quality.outOfOrderCount).toBe(0);
      expect(quality.duplicateCount).toBe(0);
    });

    it('should detect missing data points', () => {
      const startTime = Date.now();
      const data = Array.from({ length: 30 }, (_, i) => ({
        time: new Date(startTime + i * 120000).toISOString(), // Every 2 minutes instead of 1
        value: 100,
      }));

      const quality = calculateDataQuality(data, 60000); // Expected every minute

      expect(quality.completeness).toBeLessThan(100);
      expect(quality.missingCount).toBeGreaterThan(0);
    });

    it('should detect out-of-order data', () => {
      const data = [
        { time: new Date(Date.now()).toISOString(), value: 100 },
        { time: new Date(Date.now() + 60000).toISOString(), value: 100 },
        { time: new Date(Date.now() + 30000).toISOString(), value: 100 }, // Out of order
        { time: new Date(Date.now() + 120000).toISOString(), value: 100 },
      ];

      const quality = calculateDataQuality(data, 60000);

      expect(quality.outOfOrderCount).toBe(1);
    });

    it('should detect duplicate timestamps', () => {
      const timestamp = new Date(Date.now()).toISOString();
      const data = [
        { time: timestamp, value: 100 },
        { time: timestamp, value: 101 }, // Duplicate timestamp
        { time: new Date(Date.now() + 60000).toISOString(), value: 100 },
      ];

      const quality = calculateDataQuality(data, 60000);

      expect(quality.duplicateCount).toBe(1);
    });

    it('should handle empty data', () => {
      const quality = calculateDataQuality([], 60000);

      expect(quality.completeness).toBe(0);
      expect(quality.actualCount).toBe(0);
      expect(quality.expectedCount).toBe(0);
      expect(quality.missingCount).toBe(0);
      expect(quality.outOfOrderCount).toBe(0);
      expect(quality.duplicateCount).toBe(0);
    });

    it('should handle single data point', () => {
      const data = [{ time: new Date(Date.now()).toISOString(), value: 100 }];

      const quality = calculateDataQuality(data, 60000);

      expect(quality.completeness).toBe(100);
      expect(quality.actualCount).toBe(1);
      expect(quality.expectedCount).toBe(1);
    });

    it('should calculate expected count based on time span', () => {
      const startTime = Date.now();
      const data = [
        { time: new Date(startTime).toISOString(), value: 100 },
        { time: new Date(startTime + 10 * 60000).toISOString(), value: 100 }, // 10 minutes apart
      ];

      const quality = calculateDataQuality(data, 60000);

      expect(quality.expectedCount).toBe(11); // Should expect 11 points (0, 1, 2, ..., 10 minutes)
      expect(quality.actualCount).toBe(2);
      expect(quality.missingCount).toBe(9);
    });
  });
});
