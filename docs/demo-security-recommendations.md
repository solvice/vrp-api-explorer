# VRP API Explorer - Public Demo Security Strategy

## Current Security Posture Analysis

### ✅ What's Already Secure

1. **Server-Side API Keys**: Both Solvice and OpenAI keys stored in environment variables, never exposed to client
2. **Rate Limiting**: Already implemented (`lib/rate-limiter.ts`)
   - OpenAI: 10 requests / 10 minutes per IP
   - VRP API: 30 requests / 10 minutes per IP
   - IP-based tracking with proxy header support
3. **No Authentication Required**: Intentional design for public demo
4. **Input Validation**: VRP schema validation in place

### ❌ Current Vulnerabilities

1. **Cost Exposure**: Unlimited OpenAI API usage (expensive models)
2. **Resource Exhaustion**: Complex VRP problems can consume significant compute
3. **Data Privacy**: No isolation between users
4. **CSV Upload**: File processing could be abused (Phase 4 feature)
5. **No Usage Analytics**: Can't track abuse patterns
6. **No Geographic Restrictions**: Global access to demo

---

## Recommended Security Strategy for Public Demo

### Tier 1: Must-Have (Implement Before Launch)

#### 1. **Enhanced Rate Limiting**

**Current State**:
- OpenAI: 10 req/10min
- VRP: 30 req/10min

**Recommended**:
```typescript
// lib/rate-limiter.ts - Update configurations
export const rateLimiters = {
  // More aggressive for public demo
  openai: rateLimit({
    maxRequests: 5,          // Reduced from 10
    windowMs: 15 * 60 * 1000, // 15 minutes (was 10)
  }),

  vrpSolve: rateLimit({
    maxRequests: 10,         // Reduced from 30
    windowMs: 15 * 60 * 1000, // 15 minutes
  }),

  // Add daily limits per IP
  daily: rateLimit({
    maxRequests: 50,         // Total daily limit
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  }),
}
```

**Implementation**: `app/api/openai/chat/route.ts:8` + all VRP routes

---

#### 2. **Request Size Limits**

```typescript
// middleware.ts (create new file)
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Limit request body size for API routes
  const contentLength = request.headers.get('content-length');

  if (contentLength && parseInt(contentLength) > 1_000_000) { // 1MB limit
    return NextResponse.json(
      { error: 'Request too large. Maximum size: 1MB' },
      { status: 413 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

**VRP Problem Complexity Limits**:
```typescript
// app/api/vrp/solve/route.ts - Add validation before solving
const MAX_JOBS = 50;        // Limit jobs to prevent compute abuse
const MAX_RESOURCES = 10;   // Limit vehicles

if (body.jobs?.length > MAX_JOBS) {
  return NextResponse.json(
    { error: `Demo limited to ${MAX_JOBS} jobs. Contact sales for production use.` },
    { status: 400 }
  );
}

if (body.resources?.length > MAX_RESOURCES) {
  return NextResponse.json(
    { error: `Demo limited to ${MAX_RESOURCES} vehicles.` },
    { status: 400 }
  );
}
```

---

#### 3. **Cost Protection for OpenAI**

**Current Risk**: gpt-4o costs $2.50/$10 per million tokens. A malicious user could:
- Send massive JSON payloads
- Request complex modifications repeatedly
- Trigger expensive Code Interpreter sessions

**Solution - Add Token Budget Tracking**:

```typescript
// lib/cost-guardian.ts (new file)
interface DailyCostTracker {
  date: string;
  totalCost: number;
  requestCount: number;
}

class CostGuardian {
  private dailyBudget = 50.00; // $50/day max for demo
  private tracker: DailyCostTracker | null = null;

  checkBudget(estimatedCost: number): { allowed: boolean; reason?: string } {
    const today = new Date().toISOString().split('T')[0];

    // Reset daily tracker
    if (!this.tracker || this.tracker.date !== today) {
      this.tracker = { date: today, totalCost: 0, requestCount: 0 };
    }

    const projectedTotal = this.tracker.totalCost + estimatedCost;

    if (projectedTotal > this.dailyBudget) {
      return {
        allowed: false,
        reason: `Daily demo budget exceeded. Try again tomorrow or contact sales for production access.`
      };
    }

    return { allowed: true };
  }

  recordCost(actualCost: number): void {
    if (this.tracker) {
      this.tracker.totalCost += actualCost;
      this.tracker.requestCount++;
    }
  }

  getStats() {
    return this.tracker;
  }
}

export const costGuardian = new CostGuardian();
```

**Integration**:
```typescript
// app/api/openai/chat/route.ts
import { costGuardian } from '@/lib/cost-guardian';

export async function POST(request: NextRequest) {
  // Estimate cost before making request
  const estimatedCost = 0.05; // Conservative estimate for gpt-4o
  const budgetCheck = costGuardian.checkBudget(estimatedCost);

  if (!budgetCheck.allowed) {
    return NextResponse.json(
      { error: budgetCheck.reason, type: 'budget_exceeded' },
      { status: 429 }
    );
  }

  // ... existing OpenAI call ...

  // Record actual cost after completion
  if (completion.usage) {
    const actualCost = calculateCost(completion.usage, model);
    costGuardian.recordCost(actualCost);
  }
}
```

---

#### 4. **Input Sanitization**

```typescript
// lib/input-sanitizer.ts (new file)
export function sanitizeVrpInput(body: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof body !== 'object' || !body) {
    return { valid: false, errors: ['Invalid request body'] };
  }

  const vrp = body as Record<string, unknown>;

  // Prevent injection attacks via job/resource names
  const namePattern = /^[a-zA-Z0-9_-]{1,100}$/;

  if (Array.isArray(vrp.jobs)) {
    vrp.jobs.forEach((job: any, idx: number) => {
      if (job.name && !namePattern.test(job.name)) {
        errors.push(`Job ${idx}: Name contains invalid characters`);
      }
    });
  }

  // Prevent excessive time windows (DoS vector)
  if (Array.isArray(vrp.jobs)) {
    vrp.jobs.forEach((job: any, idx: number) => {
      if (job.windows && job.windows.length > 5) {
        errors.push(`Job ${idx}: Maximum 5 time windows allowed in demo`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

### Tier 2: Should-Have (Implement Within 2 Weeks)

#### 5. **Analytics & Abuse Detection**

```typescript
// lib/analytics.ts (new file)
interface UsagePattern {
  ip: string;
  requestCount: number;
  lastRequest: Date;
  suspiciousActivity: string[];
}

class AbuseDetector {
  private patterns = new Map<string, UsagePattern>();

  track(ip: string, endpoint: string, bodySize: number): void {
    let pattern = this.patterns.get(ip);

    if (!pattern) {
      pattern = {
        ip,
        requestCount: 0,
        lastRequest: new Date(),
        suspiciousActivity: []
      };
      this.patterns.set(ip, pattern);
    }

    pattern.requestCount++;
    pattern.lastRequest = new Date();

    // Detect suspicious patterns
    if (bodySize > 500_000) {
      pattern.suspiciousActivity.push(`Large payload: ${bodySize} bytes`);
    }

    // Alert if excessive usage
    if (pattern.requestCount > 100) {
      console.warn(`⚠️ Potential abuse from ${ip}: ${pattern.requestCount} requests`);
    }
  }

  getSuspiciousIPs(): string[] {
    return Array.from(this.patterns.entries())
      .filter(([_, pattern]) => pattern.suspiciousActivity.length > 3)
      .map(([ip, _]) => ip);
  }
}

export const abuseDetector = new AbuseDetector();
```

---

#### 6. **CAPTCHA for High-Value Operations**

**Use Case**: Protect expensive operations (CSV upload, Code Interpreter)

**Implementation**: Add Cloudflare Turnstile (free, privacy-friendly)

```typescript
// components/CaptchaProtected.tsx
'use client';

import { Turnstile } from '@marsidev/react-turnstile';

interface CaptchaProtectedProps {
  onVerify: (token: string) => void;
  children: React.ReactNode;
}

export function CaptchaProtected({ onVerify, children }: CaptchaProtectedProps) {
  const [verified, setVerified] = useState(false);

  if (!verified) {
    return (
      <div className="captcha-container">
        <p>Please verify you're human to use this feature:</p>
        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onSuccess={(token) => {
            setVerified(true);
            onVerify(token);
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
```

**Apply to**: CSV upload modal, expensive OpenAI operations

---

#### 7. **Geographic Rate Limiting** (Optional)

If you only want EU/US access:

```typescript
// middleware.ts - Add geo-blocking
export function middleware(request: NextRequest) {
  const country = request.geo?.country;

  const allowedCountries = ['US', 'GB', 'DE', 'FR', 'NL', 'BE']; // EU + US

  if (country && !allowedCountries.includes(country)) {
    return NextResponse.json(
      { error: 'Demo not available in your region. Contact sales for access.' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}
```

---

### Tier 3: Nice-to-Have (Future)

#### 8. **Session-Based Usage Tracking**

Generate anonymous session IDs for better tracking without auth:

```typescript
// lib/session.ts
export function getOrCreateSessionId(request: NextRequest): string {
  const sessionCookie = request.cookies.get('demo_session');

  if (sessionCookie) {
    return sessionCookie.value;
  }

  const newSessionId = crypto.randomUUID();
  // Set cookie in response headers
  return newSessionId;
}
```

Track usage per session instead of just IP (better for shared IPs).

---

#### 9. **Waitlist for Heavy Users**

```typescript
// If user hits limits repeatedly, show:
"You've exceeded demo limits. Join our waitlist for extended access:"
[Email Input] [Join Waitlist Button]
```

Converts abuse attempts into sales leads!

---

#### 10. **Demo Data Cleanup**

```typescript
// lib/data-cleanup.ts
// Run daily cron job to clear old demo data
export async function cleanupOldDemoData() {
  // Clear localStorage instructions in UI
  // Clear server-side telemetry older than 7 days
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  // Clean telemetry
  const events = telemetryService.getRecentEvents(1000);
  const filtered = events.filter(e => e.timestamp.getTime() > sevenDaysAgo);
  // ... clear old events
}
```

---

## Implementation Priority

### Week 1 (Tier 1 - Critical)
1. ✅ Enhanced rate limiting (2 hours)
2. ✅ Request size limits (1 hour)
3. ✅ VRP complexity limits (1 hour)
4. ✅ Cost guardian for OpenAI (3 hours)
5. ✅ Input sanitization (2 hours)

**Total: 9 hours**

### Week 2 (Tier 2 - Important)
1. Analytics & abuse detection (4 hours)
2. CAPTCHA integration (3 hours)
3. Geographic restrictions (1 hour - optional)

**Total: 8 hours**

---

## Monitoring Dashboard

Create simple admin view at `/api/admin/stats` (password-protected):

```typescript
// app/api/admin/stats/route.ts
export async function GET(request: NextRequest) {
  // Simple password protection
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    telemetry: telemetryService.getStats(),
    costToday: costGuardian.getStats(),
    suspiciousIPs: abuseDetector.getSuspiciousIPs(),
    rateLimit: {
      // Aggregate rate limit stats
    }
  });
}
```

---

## User-Facing Demo Messaging

Add prominent disclaimer in UI:

```typescript
// components/DemoDisclaimer.tsx
export function DemoDisclaimer() {
  return (
    <Alert className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Demo Environment</AlertTitle>
      <AlertDescription>
        This is a public demo with limitations:
        • Maximum {MAX_JOBS} jobs and {MAX_RESOURCES} vehicles
        • Rate limited to prevent abuse
        • No data persistence or privacy guarantees
        • For production use, <a href="https://solvice.io/contact">contact sales</a>
      </AlertDescription>
    </Alert>
  );
}
```

---

## Cost Projection

### Current Risk (Unprotected Demo)
- Potential abuse: 1000 OpenAI requests/day × $0.05 = **$50/day = $1,500/month**
- VRP API abuse: Unlimited (depends on your plan)

### After Implementation
- Protected daily budget: **$50/day max = $1,500/month max**
- Rate limiting prevents burst abuse
- Analytics catch patterns early

### Conservative Estimate with Protection
- Normal usage: 100-200 requests/day
- Cost: **$150-300/month** for AI features
- VRP API: Depends on Solvice plan (likely within free tier for demo)

---

## Questions to Consider

1. **Do you want to convert demo users to customers?**
   - Add "Contact Sales" CTAs when hitting limits
   - Collect emails via waitlist

2. **Geographic restrictions?**
   - GDPR compliance easier if EU/US only
   - Or allow global with proper disclaimers

3. **Data retention policy?**
   - Clear demo data daily/weekly?
   - Or keep anonymized analytics?

4. **Support burden?**
   - Add FAQ/docs link
   - Or live chat integration?

---

## Summary: Recommended Approach

**Phase 1 (Pre-Launch)**: Implement Tier 1 (9 hours)
- Rate limiting, size limits, cost guardian, input sanitization
- **Result**: Demo is safe to launch publicly

**Phase 2 (Post-Launch)**: Implement Tier 2 (8 hours)
- Analytics, CAPTCHA, monitoring
- **Result**: Can detect and respond to abuse patterns

**Phase 3 (Ongoing)**: Monitor and iterate
- Review analytics weekly
- Adjust limits based on real usage
- Convert heavy users to paid customers

---

**Total Investment**: 17 hours engineering + monitoring
**Risk Reduction**: 90%+ cost protection, minimal abuse surface
**Business Value**: Qualified leads from demo users hitting limits