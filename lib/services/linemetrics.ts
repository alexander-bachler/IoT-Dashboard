/**
 * LineMetrics API Service Adapter
 * Handles communication with LineMetrics REST API
 */

export interface LineMetricsConfig {
  apiUrl: string;
  apiToken: string;
  clientId?: string;
}

export interface LineMetricsDevice {
  id: string;
  name: string;
  description?: string;
  location?: string;
  metadata?: Record<string, unknown>;
}

export interface LineMetricsMetric {
  id: string;
  name: string;
  unit?: string;
  description?: string;
  deviceId: string;
  metricType?: string;
}

export interface LineMetricsMeasurement {
  timestamp: string; // ISO 8601
  value: number;
  metricId: string;
  deviceId: string;
  quality?: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export class LineMetricsService {
  private config: LineMetricsConfig;

  constructor(config: LineMetricsConfig) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `LineMetrics API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Fetch all devices from LineMetrics
   */
  async getDevices(): Promise<LineMetricsDevice[]> {
    // Example endpoint - adjust based on actual LineMetrics API
    const response = await this.request<{ devices: LineMetricsDevice[] }>(
      '/devices'
    );
    return response.devices;
  }

  /**
   * Fetch metrics for a specific device
   */
  async getMetrics(deviceId: string): Promise<LineMetricsMetric[]> {
    const response = await this.request<{ metrics: LineMetricsMetric[] }>(
      `/devices/${deviceId}/metrics`
    );
    return response.metrics;
  }

  /**
   * Fetch all metrics for all devices
   */
  async getAllMetrics(): Promise<LineMetricsMetric[]> {
    const devices = await this.getDevices();
    const allMetrics: LineMetricsMetric[] = [];

    for (const device of devices) {
      const metrics = await this.getMetrics(device.id);
      allMetrics.push(...metrics);
    }

    return allMetrics;
  }

  /**
   * Fetch measurements for a specific metric within a time range
   */
  async getMeasurements(
    metricId: string,
    timeRange: TimeRange,
    options?: {
      aggregation?: 'raw' | '1min' | '5min' | '15min' | '1hour' | '1day';
      limit?: number;
    }
  ): Promise<LineMetricsMeasurement[]> {
    const params = new URLSearchParams({
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString(),
      ...(options?.aggregation && { aggregation: options.aggregation }),
      ...(options?.limit && { limit: options.limit.toString() }),
    });

    const response = await this.request<{ measurements: LineMetricsMeasurement[] }>(
      `/metrics/${metricId}/measurements?${params}`
    );

    return response.measurements;
  }

  /**
   * Fetch measurements for multiple metrics
   */
  async getMultipleMetricsMeasurements(
    metricIds: string[],
    timeRange: TimeRange,
    options?: {
      aggregation?: 'raw' | '1min' | '5min' | '15min' | '1hour' | '1day';
      limit?: number;
    }
  ): Promise<Map<string, LineMetricsMeasurement[]>> {
    const results = new Map<string, LineMetricsMeasurement[]>();

    // Fetch in parallel for better performance
    await Promise.all(
      metricIds.map(async (metricId) => {
        const measurements = await this.getMeasurements(
          metricId,
          timeRange,
          options
        );
        results.set(metricId, measurements);
      })
    );

    return results;
  }

  /**
   * Test connection to LineMetrics API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/health');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a LineMetrics service instance from a data source
 */
export function createLineMetricsService(
  apiUrl: string,
  apiToken: string,
  clientId?: string
): LineMetricsService {
  return new LineMetricsService({
    apiUrl,
    apiToken,
    clientId,
  });
}
