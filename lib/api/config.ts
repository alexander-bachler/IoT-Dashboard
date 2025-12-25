/**
 * API Configuration
 * Central configuration for API base URL and environment settings
 */

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
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
    get: (id: number) => `/api/v1/dashboards/${id}`,
    create: '/api/v1/dashboards',
    update: (id: number) => `/api/v1/dashboards/${id}`,
    delete: (id: number) => `/api/v1/dashboards/${id}`,
  },

  // Data Sources
  dataSources: {
    list: '/api/v1/data-sources',
    get: (id: number) => `/api/v1/data-sources/${id}`,
    create: '/api/v1/data-sources',
    update: (id: number) => `/api/v1/data-sources/${id}`,
    delete: (id: number) => `/api/v1/data-sources/${id}`,
    stats: (id: number) => `/api/v1/data-sources/${id}/stats`,
    sync: (id: number) => `/api/v1/data-sources/${id}/sync`,
  },

  // Devices
  devices: {
    list: '/api/v1/devices',
    get: (id: number) => `/api/v1/devices/${id}`,
    create: '/api/v1/devices',
    update: (id: number) => `/api/v1/devices/${id}`,
    delete: (id: number) => `/api/v1/devices/${id}`,
  },

  // Metrics
  metrics: {
    list: '/api/v1/metrics',
    create: '/api/v1/metrics',
    update: (id: number) => `/api/v1/metrics/${id}`,
    delete: (id: number) => `/api/v1/metrics/${id}`,
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
    update: (id: number) => `/api/v1/anomalies/${id}`,
  },
} as const;
