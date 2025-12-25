/**
 * LineMetrics API Client
 *
 * Integration with LineMetrics IoT Platform
 * Based on official API documentation and Postman collection
 *
 * Rate Limit: 750 requests
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// ============================================================================
// Configuration
// ============================================================================

export interface LineMetricsConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
}

// ============================================================================
// Object Model Types
// ============================================================================

export interface LMObject {
  object_id: string;
  object_type: 'object' | 'attribute' | 'property' | 'threshold' | 'template';
  model_type: 'object';
  template_id?: string | null;
  account_id: number;
  parent_id?: string | null;
  payload?: Record<string, any>;
  measurement?: {
    unit?: string;
  };
  input?: string;
  children_info?: Record<string, number>;
  custom_key?: string;
  alias?: string;
}

export interface LMAccount {
  id: number;
  name: string;
}

export interface LMDataPoint {
  val: number;
  ts: number; // Unix timestamp in milliseconds
  min?: number;
  max?: number;
}

export interface LMDataConfig {
  input: string;
  output: string;
}

// ============================================================================
// Device Model Types
// ============================================================================

export interface LMDevice {
  id: string;
  lmId?: string;
  title: string;
  type: 'LoraSensor' | 'LoraGateway' | 'SmartMeter' | string;
  parentId?: string | null;
  parentLmId?: string | null;
  meteringPoint?: string;
  smartMeterType?: string;
  description?: string;
}

export interface LMDeviceDetail {
  data: Array<{
    id: string;
    type: string;
    attributes: {
      description?: string;
      title: string;
      lmId?: string;
      parentDeviceId?: string;
    };
    relationships: {
      inputs: {
        data: Array<{
          id: string;
          dataSourceId: string;
          type: string;
        }>;
      };
    };
  }>;
  included: Array<{
    id: string;
    type: string;
    attributes: {
      title: string;
      alias: string;
    };
  }>;
}

export interface LMInput {
  id: string;
  dataSourceId: string;
  type: string;
  title: string;
  alias: string;
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface LMDataQueryParams {
  time_from?: number; // Unix timestamp in milliseconds
  time_to?: number;   // Unix timestamp in milliseconds
  granularity?: 'PT1M' | 'PT5M' | 'PT15M' | 'PT1H' | 'PT6H' | 'PT24H' | 'PT168H';
  time_zone?: string; // e.g., 'Europe/Vienna'
  function?: 'last_value' | 'avg' | 'min' | 'max' | 'sum';
}

// ============================================================================
// LineMetrics API Client
// ============================================================================

export class LineMetricsClient {
  private client: AxiosInstance;
  private config: LineMetricsConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(config: LineMetricsConfig) {
    this.config = {
      ...config,
      apiUrl: config.apiUrl || 'https://rest-api.linemetrics.com',
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        // Ensure we have a valid token
        if (!this.accessToken || this.isTokenExpired()) {
          await this.authenticate();
        }

        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
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
          // Token expired, re-authenticate
          this.accessToken = null;
          this.tokenExpiry = null;

          if (error.config) {
            // Retry the request
            return this.client.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

  /**
   * Authenticate with LineMetrics API using OAuth2 client credentials
   */
  async authenticate(): Promise<void> {
    try {
      const response = await axios.post(
        `${this.config.apiUrl}/oauth/access_token`,
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'client_credentials',
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      this.accessToken = response.data.access_token;

      // Token typically expires in 1 hour (3600 seconds)
      // Set expiry to 55 minutes to refresh before actual expiry
      this.tokenExpiry = Date.now() + 55 * 60 * 1000;
    } catch (error) {
      console.error('LineMetrics authentication failed:', error);
      throw new Error('Failed to authenticate with LineMetrics API');
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccount();
      return true;
    } catch (error) {
      console.error('LineMetrics connection test failed:', error);
      return false;
    }
  }

  // ==========================================================================
  // Object Model API
  // ==========================================================================

  /**
   * Get account information
   */
  async getAccount(): Promise<LMAccount> {
    const response = await this.client.get<LMAccount>('/v2/account');
    return response.data;
  }

  /**
   * Get all objects (root level)
   */
  async getAllObjects(): Promise<LMObject[]> {
    const response = await this.client.get<LMObject[]>('/v2/children');
    return response.data;
  }

  /**
   * Get objects of specific type
   */
  async getObjectsByType(objectType: string): Promise<LMObject[]> {
    const response = await this.client.get<LMObject[]>('/v2/children', {
      params: { object_type: objectType },
    });
    return response.data;
  }

  /**
   * Get object by UUID
   */
  async getObject(uuid: string): Promise<LMObject> {
    const response = await this.client.get<LMObject>(`/v2/object/${uuid}`);
    return response.data;
  }

  /**
   * Get object by custom key
   */
  async getObjectByKey(customKey: string): Promise<LMObject> {
    const response = await this.client.get<LMObject>(`/v2/object/${customKey}`);
    return response.data;
  }

  /**
   * Get children of an object
   */
  async getChildren(parentUuidOrKey: string, objectType?: string): Promise<LMObject[]> {
    const params = objectType ? { object_type: objectType } : {};
    const response = await this.client.get<LMObject[]>(
      `/v2/children/${parentUuidOrKey}`,
      { params }
    );
    return response.data;
  }

  /**
   * Get data for an attribute
   */
  async getAttributeData(
    objectKeyOrUuid: string,
    alias: string,
    params?: LMDataQueryParams
  ): Promise<LMDataPoint[]> {
    const response = await this.client.get<LMDataPoint[]>(
      `/v2/data/${objectKeyOrUuid}/${alias}`,
      { params }
    );
    return response.data;
  }

  /**
   * Get last value for an attribute
   */
  async getAttributeLastValue(
    objectKeyOrUuid: string,
    alias: string
  ): Promise<LMDataPoint[]> {
    return this.getAttributeData(objectKeyOrUuid, alias, { function: 'last_value' });
  }

  /**
   * Get data configuration for an attribute
   */
  async getAttributeConfig(
    objectKeyOrUuid: string,
    alias: string
  ): Promise<LMDataConfig> {
    const response = await this.client.get<LMDataConfig>(
      `/v2/data/${objectKeyOrUuid}/${alias}/config`
    );
    return response.data;
  }

  /**
   * Get all data points for an object (aggregated)
   */
  async getObjectData(
    objectKeyOrUuid: string,
    params?: LMDataQueryParams
  ): Promise<LMDataPoint[]> {
    const response = await this.client.get<LMDataPoint[]>(
      `/v2/data/${objectKeyOrUuid}`,
      { params }
    );
    return response.data;
  }

  // ==========================================================================
  // Device Model API
  // ==========================================================================

  /**
   * Get all devices
   */
  async getAllDevices(limit?: number, offset?: number): Promise<Record<string, LMDevice>> {
    const params: any = {};
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;

    const response = await this.client.get<Record<string, LMDevice>>(
      '/v2/devices/all',
      { params }
    );
    return response.data;
  }

  /**
   * Get device details with inputs
   */
  async getDevice(
    idType: 'id' | 'lmId' | 'meteringPoint',
    value: string
  ): Promise<LMDeviceDetail> {
    const response = await this.client.get<LMDeviceDetail>('/v2/devices', {
      params: { [idType]: value },
    });
    return response.data;
  }

  /**
   * Get device by ID
   */
  async getDeviceById(id: string): Promise<LMDeviceDetail> {
    return this.getDevice('id', id);
  }

  /**
   * Get device by LineMetrics ID
   */
  async getDeviceByLmId(lmId: string): Promise<LMDeviceDetail> {
    return this.getDevice('lmId', lmId);
  }

  /**
   * Get data for a device input
   */
  async getInputData(
    inputId: string,
    params?: LMDataQueryParams
  ): Promise<LMDataPoint[]> {
    const response = await this.client.get<LMDataPoint[]>(
      `/v2/device-inputs/${inputId}/data`,
      { params }
    );
    return response.data;
  }

  /**
   * Get last value for a device input
   */
  async getInputLastValue(inputId: string): Promise<{ data: LMDataPoint[] }> {
    const response = await this.client.get<{ data: LMDataPoint[] }>(
      `/v2/device-inputs/${inputId}/lastvalue`
    );
    return response.data;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Convert Unix timestamp to ISO string
   */
  static timestampToISO(timestamp: number): string {
    return new Date(timestamp).toISOString();
  }

  /**
   * Convert ISO string to Unix timestamp
   */
  static isoToTimestamp(iso: string): number {
    return new Date(iso).getTime();
  }

  /**
   * Get granularity in minutes
   */
  static getGranularityMinutes(granularity: string): number {
    const map: Record<string, number> = {
      PT1M: 1,
      PT5M: 5,
      PT15M: 15,
      PT1H: 60,
      PT6H: 360,
      PT24H: 1440,
      PT168H: 10080,
    };
    return map[granularity] || 60;
  }

  /**
   * Extract inputs from device detail
   */
  static extractInputs(deviceDetail: LMDeviceDetail): LMInput[] {
    const device = deviceDetail.data[0];
    if (!device) return [];

    const inputsData = device.relationships.inputs.data;
    const included = deviceDetail.included;

    return inputsData.map((input) => {
      const details = included.find((inc) => inc.id === input.id);
      return {
        id: input.id,
        dataSourceId: input.dataSourceId,
        type: input.type,
        title: details?.attributes.title || '',
        alias: details?.attributes.alias || '',
      };
    });
  }
}

/**
 * Create a LineMetrics client instance
 */
export function createLineMetricsClient(config: LineMetricsConfig): LineMetricsClient {
  return new LineMetricsClient(config);
}

export default LineMetricsClient;
