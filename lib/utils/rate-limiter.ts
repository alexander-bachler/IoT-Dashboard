/**
 * API Rate Limiter
 * Simple in-memory rate limiting for API endpoints
 * For production, consider using Redis or a dedicated service
 */

import type { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/** Clear the in-memory rate-limit store. Intended for tests (isolation). */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

export interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed in the window
  windowMs: number; // Time window in milliseconds
  keyGenerator?: (req: Request | NextRequest) => string; // Custom key generator
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(req: Request): string {
  // In a real app, you'd extract IP from headers
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return `rate-limit:${ip}`;
}

/**
 * Clean up expired entries
 */
function cleanup() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanup, 60000);

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  req: Request,
  config: RateLimitConfig
): RateLimitResult {
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;
  const key = keyGenerator(req);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  const allowed = entry.count <= config.maxRequests;

  return {
    allowed,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limiter middleware for Next.js API routes
 */
export function withRateLimit<T extends Request | NextRequest>(
  handler: (req: T) => Promise<Response>,
  config: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  }
) {
  return async (req: T): Promise<Response> => {
    const result = checkRateLimit(req, config);

    // Add rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    headers.set('X-RateLimit-Remaining', result.remaining.toString());
    headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...Object.fromEntries(headers),
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Call the original handler
    const response = await handler(req);

    // Add rate limit headers to successful response
    const newHeaders = new Headers(response.headers);
    headers.forEach((value, key) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}

/**
 * Predefined rate limit configs for different endpoint types
 */
export const RateLimitPresets = {
  strict: {
    maxRequests: 10,
    windowMs: 60000, // 10 requests per minute
  },
  standard: {
    maxRequests: 100,
    windowMs: 60000, // 100 requests per minute
  },
  relaxed: {
    maxRequests: 1000,
    windowMs: 60000, // 1000 requests per minute
  },
  data: {
    maxRequests: 50,
    windowMs: 60000, // 50 requests per minute for data endpoints
  },
  auth: {
    maxRequests: 5,
    windowMs: 300000, // 5 attempts per 5 minutes for auth
  },
};
