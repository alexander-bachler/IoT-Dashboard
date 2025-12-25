/**
 * LineMetrics API Client
 *
 * Integration with LineMetrics IoT Platform
 * Documentation: https://rest-api-doc.linemetrics.com/v2/
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Types for LineMetrics API
export interface LineMetricsConfig {
  apiUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

export interface LineMetricsDevice {
  id: string;
  name: string;
  location?: string;
  description?: string;
  streams?: LineMetricsStream[];
}

export interface LineMetricsStream {
  id: string;
  name: string;
  unit?: string;
  dataType?: string;
  description?: string;
}

export interface LineMetricsMeasurement {
  streamId: string;
  timestamp: string;
  value: number;
  quality?: number;
}

export interface LineMetricsQueryParams {
  streamIds: string[];
  from: string; // ISO 8601 timestamp
  to: string;   // ISO 8601 timestamp
  aggregation?: 'none' | 'avg' | 'min' | 'max' | 'sum';
  interval?: string; // e.g., '1h', '15m', '1d'
  limit?: number;
}

export interface LineMetricsDataPoint {
  timestamp: string;
  value: number;
  quality?: number;
}

export interface LineMetricsTimeSeriesData {
  streamId: string;
  streamName: string;
  unit?: string;
  data: LineMetricsDataPoint[];
}

/**
 * LineMetrics API Client
 */
export class LineMetricsClient {
  private client: AxiosInstance;
  private config: LineMetricsConfig;
  private accessToken: string | null = null;

  constructor(config: LineMetricsConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        } else if (this.config.apiKey) {
          config.headers['X-API-Key'] = this.config.apiKey;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Try to refresh token
          await this.authenticate();
          // Retry the request
          if (error.config) {
            return this.client.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate with LineMetrics API
   */
  async authenticate(): Promise<void> {
    if (!this.config.username || !this.config.password) {
      // Using API key authentication
      return;
    }

    try {
      const response = await axios.post(`${this.config.apiUrl}/auth/login`, {
        username: this.config.username,
        password: this.config.password,
      });

      this.accessToken = response.data.access_token || response.data.token;
    } catch (error) {
      console.error('LineMetrics authentication failed:', error);
      throw new Error('Failed to authenticate with LineMetrics API');
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getDevices();
      return true;
    } catch (error) {
      console.error('LineMetrics connection test failed:', error);
      return false;
    }
  }

  /**
   * Get all devices
   */
  async getDevices(): Promise<LineMetricsDevice[]> {
    try {
      const response = await this.client.get('/devices');
      return response.data.devices || response.data;
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      throw error;
    }
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId: string): Promise<LineMetricsDevice> {
    try {
      const response = await this.client.get(`/devices/${deviceId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get streams for a device
   */
  async getDeviceStreams(deviceId: string): Promise<LineMetricsStream[]> {
    try {
      const response = await this.client.get(`/devices/${deviceId}/streams`);
      return response.data.streams || response.data;
    } catch (error) {
      console.error(`Failed to fetch streams for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get all streams
   */
  async getStreams(): Promise<LineMetricsStream[]> {
    try {
      const response = await this.client.get('/streams');
      return response.data.streams || response.data;
    } catch (error) {
      console.error('Failed to fetch streams:', error);
      throw error;
    }
  }

  /**
   * Query time-series data
   */
  async queryMeasurements(
    params: LineMetricsQueryParams
  ): Promise<LineMetricsTimeSeriesData[]> {
    try {
      const response = await this.client.post('/measurements/query', {
        stream_ids: params.streamIds,
        from: params.from,
        to: params.to,
        aggregation: params.aggregation || 'none',
        interval: params.interval,
        limit: params.limit,
      });

      // Transform response to our format
      const data = response.data.data || response.data;

      if (Array.isArray(data)) {
        return data.map((series: any) => ({
          streamId: series.stream_id || series.streamId,
          streamName: series.stream_name || series.name,
          unit: series.unit,
          data: (series.data || series.values || []).map((point: any) => ({
            timestamp: point.timestamp || point.time || point.t,
            value: point.value || point.v,
            quality: point.quality || point.q,
          })),
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to query measurements:', error);
      throw error;
    }
  }

  /**
   * Get latest measurements for streams
   */
  async getLatestMeasurements(
    streamIds: string[]
  ): Promise<Map<string, LineMetricsMeasurement>> {
    try {
      const response = await this.client.post('/measurements/latest', {
        stream_ids: streamIds,
      });

      const measurements = new Map<string, LineMetricsMeasurement>();
      const data = response.data.measurements || response.data;

      if (Array.isArray(data)) {
        data.forEach((measurement: any) => {
          measurements.set(measurement.stream_id || measurement.streamId, {
            streamId: measurement.stream_id || measurement.streamId,
            timestamp: measurement.timestamp || measurement.time,
            value: measurement.value,
            quality: measurement.quality,
          });
        });
      }

      return measurements;
    } catch (error) {
      console.error('Failed to fetch latest measurements:', error);
      throw error;
    }
  }

  /**
   * Get measurement statistics
   */
  async getMeasurementStats(
    streamId: string,
    from: string,
    to: string
  ): Promise<{
    min: number;
    max: number;
    avg: number;
    count: number;
  }> {
    try {
      const response = await this.client.get(`/streams/${streamId}/stats`, {
        params: { from, to },
      });

      return {
        min: response.data.min || 0,
        max: response.data.max || 0,
        avg: response.data.avg || response.data.average || 0,
        count: response.data.count || 0,
      };
    } catch (error) {
      console.error(`Failed to fetch stats for stream ${streamId}:`, error);
      throw error;
    }
  }

  /**
   * Export data in various formats
   */
  async exportData(
    params: LineMetricsQueryParams,
    format: 'csv' | 'json' | 'excel' = 'csv'
  ): Promise<Blob> {
    try {
      const response = await this.client.post(
        '/measurements/export',
        {
          stream_ids: params.streamIds,
          from: params.from,
          to: params.to,
          format,
        },
        {
          responseType: 'blob',
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }
}

/**
 * Create a LineMetrics client instance
 */
export function createLineMetricsClient(config: LineMetricsConfig): LineMetricsClient {
  return new LineMetricsClient(config);
}

export default LineMetricsClient;
