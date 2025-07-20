/**
 * Simple in-memory rate limiter for API routes
 * Uses sliding window approach to track requests per time window
 */

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (request: Request) => string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  totalRequests: number
}

interface RequestRecord {
  timestamps: number[]
}

class RateLimiter {
  private requests = new Map<string, RequestRecord>()

  /**
   * Check if request is allowed under rate limit
   */
  check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now()
    const windowStart = now - config.windowMs
    
    // Get or create request record for this key
    let record = this.requests.get(key)
    if (!record) {
      record = { timestamps: [] }
      this.requests.set(key, record)
    }

    // Remove expired timestamps (outside current window)
    record.timestamps = record.timestamps.filter(timestamp => timestamp > windowStart)

    const currentRequests = record.timestamps.length
    const allowed = currentRequests < config.maxRequests
    
    if (allowed) {
      // Add current request timestamp
      record.timestamps.push(now)
    }

    // Calculate when the window resets (when oldest request expires)
    const oldestRequest = record.timestamps[0]
    const resetTime = oldestRequest ? oldestRequest + config.windowMs : now + config.windowMs

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - currentRequests - (allowed ? 1 : 0)),
      resetTime,
      totalRequests: currentRequests + (allowed ? 1 : 0)
    }
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now()
    const maxAge = 60 * 60 * 1000 // 1 hour

    for (const [key, record] of this.requests.entries()) {
      // Remove records with no recent activity
      const hasRecentActivity = record.timestamps.some(timestamp => 
        (now - timestamp) < maxAge
      )
      
      if (!hasRecentActivity) {
        this.requests.delete(key)
      }
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter()

// Clean up expired entries every 10 minutes
setInterval(() => {
  rateLimiter.cleanup()
}, 10 * 60 * 1000)

/**
 * Default key generator - uses IP address from request
 */
function defaultKeyGenerator(request: Request): string {
  // Try to get real IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const remoteAddr = request.headers.get('remote-addr')
  
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }
  
  return realIp || remoteAddr || 'unknown'
}

/**
 * Rate limit middleware for API routes
 */
export function rateLimit(config: RateLimitConfig) {
  const keyGenerator = config.keyGenerator || defaultKeyGenerator

  return (request: Request): RateLimitResult => {
    const key = keyGenerator(request)
    return rateLimiter.check(key, config)
  }
}

/**
 * Pre-configured rate limiters for different API endpoints
 */
export const rateLimiters = {
  // OpenAI API: 10 requests per 10 minutes
  openai: rateLimit({
    maxRequests: 10,
    windowMs: 10 * 60 * 1000, // 10 minutes
  }),

  // VRP API: 30 requests per 10 minutes (more generous for solve operations)
  vrp: rateLimit({
    maxRequests: 30,
    windowMs: 10 * 60 * 1000, // 10 minutes
  }),

  // Debug endpoint: 5 requests per minute
  debug: rateLimit({
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  }),
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.totalRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  }
}