import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { toast } from 'sonner';

// API Base URL - can be configured via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Create Axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth tokens, logging, etc.
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    // Handle errors globally
    const errorMessage = getErrorMessage(error);

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', error);
    }

    // Don't show toast for 401 (handled by auth logic)
    if (error.response?.status !== 401) {
      toast.error(errorMessage);
    }

    // Handle 401 Unauthorized - redirect to login or refresh token
    if (error.response?.status === 401) {
      // Clear auth token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
      // Redirect to login or show auth modal
      // This would be implemented based on your auth flow
    }

    return Promise.reject(error);
  }
);

// Helper function to extract error message
function getErrorMessage(error: AxiosError): string {
  if (error.response?.data) {
    const data = error.response.data as any;
    return data.message || data.error || 'An error occurred';
  }

  if (error.request) {
    return 'No response from server. Please check your connection.';
  }

  return error.message || 'An unexpected error occurred';
}

// Export configured axios instance
export default apiClient;

// Export helper types
export type { AxiosError, AxiosResponse };
