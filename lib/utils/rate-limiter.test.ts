import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, withRateLimit, RateLimitPresets } from './rate-limiter';

// Helper to create mock Request
function createMockRequest(ip: string = '127.0.0.1'): Request {
  return {
    headers: new Headers({
      'x-forwarded-for': ip,
    }),
  } as Request;
}

describe('Rate Limiter', () => {
  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Clear rate limit store between tests
      vi.clearAllMocks();
    });

    it('should allow first request', () => {
      const req = createMockRequest('192.168.1.1');
      const config = { maxRequests: 10, windowMs: 60000 };

      const result = checkRateLimit(req, config);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });

    it('should track multiple requests from same IP', () => {
      const req = createMockRequest('192.168.1.1');
      const config = { maxRequests: 3, windowMs: 60000 };

      const result1 = checkRateLimit(req, config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = checkRateLimit(req, config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = checkRateLimit(req, config);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);

      const result4 = checkRateLimit(req, config);
      expect(result4.allowed).toBe(false);
      expect(result4.remaining).toBe(0);
    });

    it('should differentiate between different IPs', () => {
      const req1 = createMockRequest('192.168.1.1');
      const req2 = createMockRequest('192.168.1.2');
      const config = { maxRequests: 2, windowMs: 60000 };

      const result1 = checkRateLimit(req1, config);
      expect(result1.allowed).toBe(true);

      const result2 = checkRateLimit(req2, config);
      expect(result2.allowed).toBe(true);

      // Both should be independent
      const result3 = checkRateLimit(req1, config);
      expect(result3.allowed).toBe(true);

      const result4 = checkRateLimit(req2, config);
      expect(result4.allowed).toBe(true);
    });

    it('should use custom key generator', () => {
      const req = createMockRequest('192.168.1.1');
      const customKey = 'custom-user-123';
      const config = {
        maxRequests: 10,
        windowMs: 60000,
        keyGenerator: () => customKey,
      };

      const result = checkRateLimit(req, config);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
    });

    it('should set correct reset time', () => {
      const req = createMockRequest('192.168.1.1');
      const config = { maxRequests: 10, windowMs: 60000 };
      const beforeTime = Date.now();

      const result = checkRateLimit(req, config);

      expect(result.resetTime).toBeGreaterThan(beforeTime);
      expect(result.resetTime).toBeLessThanOrEqual(beforeTime + config.windowMs + 100);
    });

    it('should reset after window expires', async () => {
      const req = createMockRequest('192.168.1.1');
      const config = { maxRequests: 1, windowMs: 100 }; // 100ms window

      // First request
      const result1 = checkRateLimit(req, config);
      expect(result1.allowed).toBe(true);

      // Second request (should be blocked)
      const result2 = checkRateLimit(req, config);
      expect(result2.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Third request (should be allowed after reset)
      const result3 = checkRateLimit(req, config);
      expect(result3.allowed).toBe(true);
    });
  });

  describe('withRateLimit', () => {
    it('should call handler when rate limit not exceeded', async () => {
      const mockHandler = vi.fn(async () => {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const wrappedHandler = withRateLimit(mockHandler, {
        maxRequests: 10,
        windowMs: 60000,
      });

      const req = createMockRequest('192.168.1.1');
      const response = await wrappedHandler(req);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should return 429 when rate limit exceeded', async () => {
      const mockHandler = vi.fn(async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const wrappedHandler = withRateLimit(mockHandler, {
        maxRequests: 2,
        windowMs: 60000,
      });

      const req = createMockRequest('192.168.1.1');

      // Make allowed requests
      await wrappedHandler(req);
      await wrappedHandler(req);

      // This should be blocked
      const response = await wrappedHandler(req);

      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body.error).toBe('Too Many Requests');
    });

    it('should add rate limit headers to response', async () => {
      const mockHandler = vi.fn(async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const wrappedHandler = withRateLimit(mockHandler, {
        maxRequests: 10,
        windowMs: 60000,
      });

      const req = createMockRequest('192.168.1.1');
      const response = await wrappedHandler(req);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('should add Retry-After header when rate limited', async () => {
      const mockHandler = vi.fn(async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const wrappedHandler = withRateLimit(mockHandler, {
        maxRequests: 1,
        windowMs: 60000,
      });

      const req = createMockRequest('192.168.1.1');

      // First request (allowed)
      await wrappedHandler(req);

      // Second request (blocked)
      const response = await wrappedHandler(req);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeTruthy();

      const retryAfter = parseInt(response.headers.get('Retry-After') || '0');
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });

    it('should use default config when none provided', async () => {
      const mockHandler = vi.fn(async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const wrappedHandler = withRateLimit(mockHandler); // No config provided

      const req = createMockRequest('192.168.1.1');
      const response = await wrappedHandler(req);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100'); // Default is 100
    });
  });

  describe('RateLimitPresets', () => {
    it('should have strict preset', () => {
      expect(RateLimitPresets.strict.maxRequests).toBe(10);
      expect(RateLimitPresets.strict.windowMs).toBe(60000);
    });

    it('should have standard preset', () => {
      expect(RateLimitPresets.standard.maxRequests).toBe(100);
      expect(RateLimitPresets.standard.windowMs).toBe(60000);
    });

    it('should have relaxed preset', () => {
      expect(RateLimitPresets.relaxed.maxRequests).toBe(1000);
      expect(RateLimitPresets.relaxed.windowMs).toBe(60000);
    });

    it('should have data preset', () => {
      expect(RateLimitPresets.data.maxRequests).toBe(50);
      expect(RateLimitPresets.data.windowMs).toBe(60000);
    });

    it('should have auth preset with longer window', () => {
      expect(RateLimitPresets.auth.maxRequests).toBe(5);
      expect(RateLimitPresets.auth.windowMs).toBe(300000); // 5 minutes
    });
  });
});
