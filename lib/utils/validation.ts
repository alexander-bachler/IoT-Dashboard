/**
 * Environment variable validation
 * Ensures all required environment variables are set
 */

interface EnvironmentConfig {
  DATABASE_URL: string;
  NODE_ENV?: string;
}

export function validateEnvironment(): EnvironmentConfig {
  const required = ['DATABASE_URL'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

/**
 * Validate data source configuration
 */
export function validateDataSource(config: {
  name: string;
  apiUrl: string;
  apiToken: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!config.apiUrl || config.apiUrl.trim().length === 0) {
    errors.push('API URL is required');
  } else if (!isValidUrl(config.apiUrl)) {
    errors.push('API URL must be a valid URL');
  }

  if (!config.apiToken || config.apiToken.trim().length === 0) {
    errors.push('API Token is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate time range
 */
export function validateTimeRange(start: Date, end: Date): {
  valid: boolean;
  error?: string;
} {
  if (isNaN(start.getTime())) {
    return { valid: false, error: 'Start date is invalid' };
  }

  if (isNaN(end.getTime())) {
    return { valid: false, error: 'End date is invalid' };
  }

  if (start >= end) {
    return { valid: false, error: 'Start date must be before end date' };
  }

  // Warn if range is too large (> 1 year)
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 365) {
    return {
      valid: false,
      error: 'Time range cannot exceed 1 year. Please use a smaller range.',
    };
  }

  return { valid: true };
}

/**
 * Helper: Check if string is valid URL
 */
function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize metric name for safe display
 */
export function sanitizeMetricName(name: string): string {
  return name.replace(/[<>]/g, '');
}

/**
 * Validate metric IDs array
 */
export function validateMetricIds(metricIds: unknown): {
  valid: boolean;
  error?: string;
} {
  if (!Array.isArray(metricIds)) {
    return { valid: false, error: 'Metric IDs must be an array' };
  }

  if (metricIds.length === 0) {
    return { valid: false, error: 'At least one metric must be selected' };
  }

  if (metricIds.length > 20) {
    return {
      valid: false,
      error: 'Cannot select more than 20 metrics at once',
    };
  }

  for (const id of metricIds) {
    if (typeof id !== 'string' || id.trim().length === 0) {
      return { valid: false, error: 'Invalid metric ID format' };
    }
  }

  return { valid: true };
}
