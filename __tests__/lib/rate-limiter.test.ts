import { rateLimit, rateLimiters, createRateLimitHeaders } from '@/lib/rate-limiter'

// Mock Request for testing
class MockRequest {
  headers: Map<string, string>

  constructor(headers: Record<string, string> = {}) {
    this.headers = new Map(Object.entries(headers))
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null
  }
}

// Create mock request
function createMockRequest(headers: Record<string, string> = {}): Request {
  const mockRequest = new MockRequest(headers)
  return {
    headers: {
      get: (name: string) => mockRequest.get(name)
    }
  } as unknown as Request
}

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear any existing rate limit data
    jest.clearAllMocks()
  })

  describe('Basic Rate Limiting', () => {
    it('allows requests within limit', () => {
      const limiter = rateLimit({
        maxRequests: 5,
        windowMs: 60000 // 1 minute
      })

      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.1' })

      // Should allow first 5 requests
      for (let i = 0; i < 5; i++) {
        const result = limiter(request)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(4 - i)
      }
    })

    it('blocks requests over limit', () => {
      const limiter = rateLimit({
        maxRequests: 3,
        windowMs: 60000
      })

      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.2' })

      // Allow first 3 requests
      for (let i = 0; i < 3; i++) {
        const result = limiter(request)
        expect(result.allowed).toBe(true)
      }

      // Block 4th request
      const result = limiter(request)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('resets after time window', async () => {
      const limiter = rateLimit({
        maxRequests: 2,
        windowMs: 100 // 100ms for quick test
      })

      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.3' })

      // Use up the limit
      limiter(request)
      limiter(request)
      
      const blockedResult = limiter(request)
      expect(blockedResult.allowed).toBe(false)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should allow requests again
      const allowedResult = limiter(request)
      expect(allowedResult.allowed).toBe(true)
    })
  })

  describe('IP Address Detection', () => {
    it('uses x-forwarded-for header', () => {
      const limiter = rateLimit({
        maxRequests: 1,
        windowMs: 60000
      })

      const request1 = createMockRequest({ 'x-forwarded-for': '192.168.1.10' })
      const request2 = createMockRequest({ 'x-forwarded-for': '192.168.1.11' })

      // Different IPs should have separate limits
      expect(limiter(request1).allowed).toBe(true)
      expect(limiter(request2).allowed).toBe(true)
    })

    it('falls back to x-real-ip header', () => {
      const limiter = rateLimit({
        maxRequests: 1,
        windowMs: 60000
      })

      const request = createMockRequest({ 'x-real-ip': '10.0.0.1' })
      
      expect(limiter(request).allowed).toBe(true)
      expect(limiter(request).allowed).toBe(false) // Second request blocked
    })

    it('handles missing IP headers', () => {
      const limiter = rateLimit({
        maxRequests: 1,
        windowMs: 60000
      })

      const request = createMockRequest({})
      
      // Should still work with 'unknown' IP
      expect(limiter(request).allowed).toBe(true)
      expect(limiter(request).allowed).toBe(false)
    })
  })

  describe('Pre-configured Rate Limiters', () => {
    it('has correct OpenAI limiter config', () => {
      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.20' })
      
      // OpenAI limiter: 10 requests per 10 minutes
      for (let i = 0; i < 10; i++) {
        const result = rateLimiters.openai(request)
        expect(result.allowed).toBe(true)
      }

      // 11th request should be blocked
      const result = rateLimiters.openai(request)
      expect(result.allowed).toBe(false)
    })

    it('has correct VRP limiter config', () => {
      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.21' })
      
      // VRP limiter: 30 requests per 10 minutes
      for (let i = 0; i < 30; i++) {
        const result = rateLimiters.vrp(request)
        expect(result.allowed).toBe(true)
      }

      // 31st request should be blocked
      const result = rateLimiters.vrp(request)
      expect(result.allowed).toBe(false)
    })
  })

  describe('Rate Limit Headers', () => {
    it('creates correct headers', () => {
      const result = {
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
        totalRequests: 3
      }

      const headers = createRateLimitHeaders(result)

      expect(headers['X-RateLimit-Limit']).toBe('3')
      expect(headers['X-RateLimit-Remaining']).toBe('5')
      expect(headers['X-RateLimit-Reset']).toBe(Math.ceil(result.resetTime / 1000).toString())
    })
  })

  describe('Custom Key Generator', () => {
    it('uses custom key generator', () => {
      const customLimiter = rateLimit({
        maxRequests: 1,
        windowMs: 60000,
        keyGenerator: () => 'custom-key'
      })

      const request1 = createMockRequest({ 'x-forwarded-for': '192.168.1.30' })
      const request2 = createMockRequest({ 'x-forwarded-for': '192.168.1.31' })

      // Both requests should use same key, so second should be blocked
      expect(customLimiter(request1).allowed).toBe(true)
      expect(customLimiter(request2).allowed).toBe(false)
    })
  })
})