/**
 * API Configuration
 * Central configuration for API base URL and environment settings
 */

// Helper to get API URL - handles empty string from build-time replacement
const getApiUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  // If env var is set and not empty, use it
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }
  // Fallback to localhost:8000
  return 'http://localhost:8000';
};

const getWsUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }
  return 'ws://localhost:8000';
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  WS_URL: getWsUrl(),
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/api/v1/auth/login',
    register: '/api/v1/auth/register',
    me: '/api/v1/auth/me',
    refresh: '/api/v1/auth/refresh',
  },

  // Dashboards
  dashboards: {
    list: '/api/v1/dashboards',
    get: (id: string) => `/api/v1/dashboards/${id}`,
    create: '/api/v1/dashboards',
    update: (id: string) => `/api/v1/dashboards/${id}`,
    delete: (id: string) => `/api/v1/dashboards/${id}`,
  },

  // Data Sources
  dataSources: {
    list: '/api/v1/data-sources',
    get: (id: string) => `/api/v1/data-sources/${id}`,
    create: '/api/v1/data-sources',
    update: (id: string) => `/api/v1/data-sources/${id}`,
    delete: (id: string) => `/api/v1/data-sources/${id}`,
    stats: (id: string) => `/api/v1/data-sources/${id}/stats`,
    sync: (id: string) => `/api/v1/data-sources/${id}/sync`,
  },

  // Devices
  devices: {
    list: '/api/v1/devices',
    get: (id: string) => `/api/v1/devices/${id}`,
    create: '/api/v1/devices',
    update: (id: string) => `/api/v1/devices/${id}`,
    delete: (id: string) => `/api/v1/devices/${id}`,
  },

  // Metrics
  metrics: {
    list: '/api/v1/metrics',
    create: '/api/v1/metrics',
    update: (id: string) => `/api/v1/metrics/${id}`,
    delete: (id: string) => `/api/v1/metrics/${id}`,
  },

  // Measurements
  measurements: {
    query: '/api/v1/measurements/query',
    create: '/api/v1/measurements',
    batch: '/api/v1/measurements/batch',
    stats: '/api/v1/measurements/stats',
  },

  // Anomalies
  anomalies: {
    query: '/api/v1/anomalies/query',
    stats: '/api/v1/anomalies/stats',
    create: '/api/v1/anomalies',
    update: (id: string) => `/api/v1/anomalies/${id}`,
  },

  // Calculations
  calculations: {
    list: '/api/v1/calculations',
    create: '/api/v1/calculations',
    get: (id: string) => `/api/v1/calculations/${id}`,
    update: (id: string) => `/api/v1/calculations/${id}`,
    delete: (id: string) => `/api/v1/calculations/${id}`,
    preview: '/api/v1/calculations/preview',
    evaluate: (id: string) => `/api/v1/calculations/${id}/evaluate`,
  },
} as const;
