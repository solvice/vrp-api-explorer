# Tiered Access Strategy: Anonymous vs Authenticated Users

## Overview

Implement a **freemium model** where anonymous users get limited demo access, and authenticated users get expanded capabilities. This approach:
- Protects against abuse (anonymous limits are low)
- Incentivizes sign-up (authenticated users get more)
- Captures leads (email + user data)
- Maintains "try before you buy" UX

---

## Access Tiers

### 🔓 **Tier 0: Anonymous/Guest** (Current)
**Goal**: Let users explore basic functionality without friction

| Resource | Limit | Rationale |
|----------|-------|-----------|
| **VRP Jobs** | 20 max | Enough for meaningful demo |
| **VRP Resources** | 3 max | 1-3 vehicles typical for small demo |
| **OpenAI Requests** | 3 per hour | See AI capabilities, not enough to abuse |
| **OpenAI Daily Budget** | $2/day per IP | ~40 requests at gpt-4o-mini pricing |
| **CSV Upload** | Not available | Too expensive, requires auth |
| **Code Interpreter** | Not available | Expensive, requires auth |
| **Request Rate** | 5 req/15min | Tight for anonymous |
| **Data Persistence** | None | Session-only, no saves |

**Messaging**:
```
"Anonymous Demo Mode: Limited to 20 jobs, 3 vehicles
Sign up for free to unlock 100 jobs, AI features, and save your work!"
```

---

### 🔑 **Tier 1: Authenticated (Free Account)**
**Goal**: Capture email, provide useful free tier, upsell to paid

| Resource | Limit | Rationale |
|----------|-------|-----------|
| **VRP Jobs** | 100 max | Useful for real exploration |
| **VRP Resources** | 10 max | Multi-vehicle routing |
| **OpenAI Requests** | 20 per hour | Meaningful AI usage |
| **OpenAI Daily Budget** | $5/day per user | ~100 requests, sustainable |
| **CSV Upload** | ✅ Available (5MB, 1 file) | Key differentiator |
| **Code Interpreter** | ✅ Available (limited) | Advanced feature |
| **Request Rate** | 15 req/15min | Comfortable usage |
| **Data Persistence** | ✅ Save to account | Keep work, return later |
| **Export Results** | ✅ Available | Download VRP solutions |

**Messaging**:
```
"Free Account: 100 jobs, unlimited AI assistance, save your work
Upgrade to Pro for production-scale problems and priority support"
```

---

### 💎 **Tier 2: Pro Account** (Paid)
**Goal**: Convert power users to paid customers

| Resource | Limit | Rationale |
|----------|-------|-----------|
| **VRP Jobs** | 1000 max | Production-ready |
| **VRP Resources** | 100 max | Fleet-scale optimization |
| **OpenAI Requests** | Unlimited | No AI restrictions |
| **OpenAI Daily Budget** | $50/day per user | Heavy usage allowed |
| **CSV Upload** | ✅ Multi-file, 50MB | Bulk operations |
| **Code Interpreter** | ✅ Unlimited | Full feature access |
| **Request Rate** | 100 req/15min | No practical limits |
| **Data Persistence** | ✅ Unlimited projects | Full workspace |
| **API Access** | ✅ Direct API keys | Programmatic access |
| **Priority Support** | ✅ Email/Slack | SLA guarantees |
| **Custom Deployment** | Optional | On-premise available |

**Pricing**: €49-99/month depending on usage

---

## Implementation Architecture

### 1. Authentication System

**Recommendation**: Use **Clerk** or **Auth0** (faster than rolling your own)

```bash
pnpm add @clerk/nextjs
```

**Why Clerk?**
- Next.js 15 App Router native
- Built-in UI components
- Free tier: 10k MAU (monthly active users)
- OAuth providers (Google, GitHub, Microsoft)
- Email/password fallback
- User metadata storage

**Alternative**: NextAuth.js v5 (open source, self-hosted)

---

### 2. User Model & Metadata

```typescript
// lib/auth/user-profile.ts
export interface UserProfile {
  id: string;
  email: string;
  createdAt: Date;

  // Access tier
  tier: 'anonymous' | 'free' | 'pro';

  // Usage tracking
  usage: {
    openaiRequestsToday: number;
    openaiCostToday: number;
    vrpSolvesThisMonth: number;
    lastResetDate: string; // YYYY-MM-DD
  };

  // Preferences
  preferences?: {
    defaultVehicleCount?: number;
    favoriteProblems?: string[]; // Saved problem IDs
  };

  // Subscription info (for Pro tier)
  subscription?: {
    status: 'active' | 'cancelled' | 'past_due';
    plan: 'pro_monthly' | 'pro_yearly';
    currentPeriodEnd: Date;
    stripeCustomerId?: string;
  };
}

// Store in Clerk user metadata or separate DB
```

---

### 3. Tier Configuration

```typescript
// lib/auth/tier-config.ts
export interface TierLimits {
  vrp: {
    maxJobs: number;
    maxResources: number;
  };
  openai: {
    requestsPerHour: number;
    dailyBudgetUSD: number;
  };
  features: {
    csvUpload: boolean;
    codeInterpreter: boolean;
    dataPersistence: boolean;
    apiAccess: boolean;
  };
  rateLimit: {
    maxRequestsPer15Min: number;
  };
}

export const TIER_CONFIGS: Record<UserProfile['tier'], TierLimits> = {
  anonymous: {
    vrp: { maxJobs: 20, maxResources: 3 },
    openai: { requestsPerHour: 3, dailyBudgetUSD: 2 },
    features: {
      csvUpload: false,
      codeInterpreter: false,
      dataPersistence: false,
      apiAccess: false,
    },
    rateLimit: { maxRequestsPer15Min: 5 },
  },

  free: {
    vrp: { maxJobs: 100, maxResources: 10 },
    openai: { requestsPerHour: 20, dailyBudgetUSD: 5 },
    features: {
      csvUpload: true,
      codeInterpreter: true,
      dataPersistence: true,
      apiAccess: false,
    },
    rateLimit: { maxRequestsPer15Min: 15 },
  },

  pro: {
    vrp: { maxJobs: 1000, maxResources: 100 },
    openai: { requestsPerHour: 999999, dailyBudgetUSD: 50 },
    features: {
      csvUpload: true,
      codeInterpreter: true,
      dataPersistence: true,
      apiAccess: true,
    },
    rateLimit: { maxRequestsPer15Min: 100 },
  },
};

export function getUserTier(userId: string | null): UserProfile['tier'] {
  if (!userId) return 'anonymous';

  // Fetch from Clerk metadata or database
  const user = getUserProfile(userId);
  return user?.tier || 'free'; // Default to free for authenticated users
}

export function getTierLimits(tier: UserProfile['tier']): TierLimits {
  return TIER_CONFIGS[tier];
}
```

---

### 4. Middleware for Tier Enforcement

```typescript
// lib/auth/tier-enforcement.ts
import { auth } from '@clerk/nextjs';
import { getUserTier, getTierLimits } from './tier-config';

export interface TierCheckResult {
  allowed: boolean;
  tier: UserProfile['tier'];
  limits: TierLimits;
  reason?: string;
  upgradeRequired?: boolean;
}

export async function checkTierAccess(
  feature: 'vrp_solve' | 'openai_request' | 'csv_upload' | 'code_interpreter'
): Promise<TierCheckResult> {
  const { userId } = auth();
  const tier = getUserTier(userId);
  const limits = getTierLimits(tier);

  // Check feature access
  switch (feature) {
    case 'csv_upload':
      if (!limits.features.csvUpload) {
        return {
          allowed: false,
          tier,
          limits,
          reason: 'CSV upload requires a free account. Sign up to unlock!',
          upgradeRequired: true,
        };
      }
      break;

    case 'code_interpreter':
      if (!limits.features.codeInterpreter) {
        return {
          allowed: false,
          tier,
          limits,
          reason: 'Code Interpreter requires a free account.',
          upgradeRequired: true,
        };
      }
      break;

    case 'openai_request':
      // Check hourly rate limit
      const usage = await getUserUsage(userId);
      if (usage.openaiRequestsThisHour >= limits.openai.requestsPerHour) {
        return {
          allowed: false,
          tier,
          limits,
          reason: tier === 'anonymous'
            ? 'Hourly AI limit reached. Sign up for 6x more requests!'
            : 'Hourly AI limit reached. Upgrade to Pro for unlimited access.',
          upgradeRequired: tier !== 'pro',
        };
      }

      // Check daily budget
      if (usage.openaiCostToday >= limits.openai.dailyBudgetUSD) {
        return {
          allowed: false,
          tier,
          limits,
          reason: tier === 'pro'
            ? 'Daily AI budget reached. Contact sales for enterprise limits.'
            : 'Daily AI budget reached. Upgrade to Pro for 10x higher limits.',
          upgradeRequired: tier !== 'pro',
        };
      }
      break;
  }

  return {
    allowed: true,
    tier,
    limits,
  };
}

export async function checkVrpComplexity(
  jobCount: number,
  resourceCount: number
): Promise<TierCheckResult> {
  const { userId } = auth();
  const tier = getUserTier(userId);
  const limits = getTierLimits(tier);

  if (jobCount > limits.vrp.maxJobs) {
    return {
      allowed: false,
      tier,
      limits,
      reason: tier === 'anonymous'
        ? `Demo limited to ${limits.vrp.maxJobs} jobs. Sign up for ${TIER_CONFIGS.free.vrp.maxJobs}!`
        : tier === 'free'
        ? `Free tier limited to ${limits.vrp.maxJobs} jobs. Upgrade to Pro for ${TIER_CONFIGS.pro.vrp.maxJobs}!`
        : `Maximum ${limits.vrp.maxJobs} jobs. Contact sales for enterprise.`,
      upgradeRequired: tier !== 'pro',
    };
  }

  if (resourceCount > limits.vrp.maxResources) {
    return {
      allowed: false,
      tier,
      limits,
      reason: `Maximum ${limits.vrp.maxResources} vehicles for ${tier} tier.`,
      upgradeRequired: tier !== 'pro',
    };
  }

  return { allowed: true, tier, limits };
}
```

---

### 5. API Route Integration

```typescript
// app/api/vrp/solve/route.ts
import { checkTierAccess, checkVrpComplexity } from '@/lib/auth/tier-enforcement';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Check tier limits BEFORE solving
  const complexityCheck = await checkVrpComplexity(
    body.jobs?.length || 0,
    body.resources?.length || 0
  );

  if (!complexityCheck.allowed) {
    return NextResponse.json(
      {
        error: complexityCheck.reason,
        tier: complexityCheck.tier,
        upgradeRequired: complexityCheck.upgradeRequired,
        upgradeTo: complexityCheck.tier === 'anonymous' ? 'free' : 'pro',
      },
      { status: 403 }
    );
  }

  // Track usage for this user
  await trackVrpUsage(complexityCheck.tier, body);

  // Proceed with solving...
  const result = await vrpClient.solve(body);

  return NextResponse.json({
    ...result,
    userTier: complexityCheck.tier,
    limitsRemaining: {
      jobs: complexityCheck.limits.vrp.maxJobs - body.jobs.length,
      resources: complexityCheck.limits.vrp.maxResources - body.resources.length,
    }
  });
}
```

```typescript
// app/api/openai/chat/route.ts
import { checkTierAccess } from '@/lib/auth/tier-enforcement';

export async function POST(request: NextRequest) {
  // Check OpenAI access tier
  const tierCheck = await checkTierAccess('openai_request');

  if (!tierCheck.allowed) {
    return NextResponse.json(
      {
        error: tierCheck.reason,
        tier: tierCheck.tier,
        upgradeRequired: tierCheck.upgradeRequired,
      },
      { status: 403 }
    );
  }

  // Make OpenAI call...
  const completion = await openai.chat.completions.create({...});

  // Track actual cost
  const cost = calculateCost(completion.usage, model);
  await trackOpenAIUsage(tierCheck.tier, cost);

  return NextResponse.json({
    content: completion.choices[0].message.content,
    usage: completion.usage,
    userTier: tierCheck.tier,
    budgetRemaining: tierCheck.limits.openai.dailyBudgetUSD - cost,
  });
}
```

---

### 6. Enhanced Rate Limiter (Tier-Aware)

```typescript
// lib/rate-limiter.ts - Update to support tiers
import { auth } from '@clerk/nextjs';
import { getUserTier, getTierLimits } from './auth/tier-config';

export function tierAwareRateLimit() {
  return (request: Request): RateLimitResult => {
    const { userId } = auth();
    const tier = getUserTier(userId);
    const limits = getTierLimits(tier);

    // Use user ID if authenticated, IP if anonymous
    const key = userId || defaultKeyGenerator(request);

    return rateLimiter.check(key, {
      maxRequests: limits.rateLimit.maxRequestsPer15Min,
      windowMs: 15 * 60 * 1000,
    });
  };
}

// Update existing rate limiters
export const rateLimiters = {
  openai: tierAwareRateLimit(),
  vrp: tierAwareRateLimit(),
  // ... other endpoints
};
```

---

### 7. UI Components for Tier Display

```typescript
// components/auth/TierBadge.tsx
'use client';

import { useUser } from '@clerk/nextjs';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles } from 'lucide-react';

export function TierBadge() {
  const { user } = useUser();
  const tier = user?.publicMetadata?.tier || 'anonymous';

  const tierConfig = {
    anonymous: { label: 'Demo', icon: null, variant: 'secondary' },
    free: { label: 'Free', icon: Sparkles, variant: 'default' },
    pro: { label: 'Pro', icon: Crown, variant: 'premium' },
  };

  const config = tierConfig[tier as keyof typeof tierConfig];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant as any} className="gap-1">
      {Icon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
```

```typescript
// components/auth/UpgradePrompt.tsx
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface UpgradePromptProps {
  feature: string;
  currentTier: 'anonymous' | 'free';
  targetTier: 'free' | 'pro';
}

export function UpgradePrompt({ feature, currentTier, targetTier }: UpgradePromptProps) {
  const { user } = useUser();

  const messages = {
    'anonymous-to-free': {
      title: 'Sign Up to Unlock',
      description: `${feature} requires a free account. Sign up in seconds to get 5x more capacity!`,
      cta: 'Sign Up Free',
      action: '/sign-up',
    },
    'free-to-pro': {
      title: 'Upgrade to Pro',
      description: `${feature} requires a Pro account for production-scale usage.`,
      cta: 'View Pro Plans',
      action: '/pricing',
    },
  };

  const key = `${currentTier}-to-${targetTier}` as keyof typeof messages;
  const msg = messages[key];

  return (
    <Alert className="border-primary/50 bg-primary/5">
      <Sparkles className="h-4 w-4" />
      <AlertTitle>{msg.title}</AlertTitle>
      <AlertDescription className="mt-2">
        {msg.description}
        <Button asChild className="mt-3 w-full" size="sm">
          <a href={msg.action}>
            {msg.cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

```typescript
// components/auth/UsageIndicator.tsx
'use client';

import { useUser } from '@clerk/nextjs';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function UsageIndicator() {
  const { user } = useUser();
  const usage = user?.publicMetadata?.usage as UserProfile['usage'];
  const tier = user?.publicMetadata?.tier as UserProfile['tier'] || 'anonymous';
  const limits = getTierLimits(tier);

  const aiUsagePercent = (usage?.openaiRequestsToday || 0) / limits.openai.requestsPerHour * 100;
  const budgetUsagePercent = (usage?.openaiCostToday || 0) / limits.openai.dailyBudgetUSD * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Today's Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>AI Requests</span>
            <span>{usage?.openaiRequestsToday || 0} / {limits.openai.requestsPerHour}</span>
          </div>
          <Progress value={aiUsagePercent} />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>AI Budget</span>
            <span>${(usage?.openaiCostToday || 0).toFixed(2)} / ${limits.openai.dailyBudgetUSD}</span>
          </div>
          <Progress value={budgetUsagePercent} />
        </div>

        {tier !== 'pro' && aiUsagePercent > 70 && (
          <p className="text-xs text-muted-foreground">
            Running low? <a href="/pricing" className="text-primary underline">Upgrade for more</a>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### 8. Sign-Up Flow Integration

```typescript
// app/layout.tsx - Add Clerk provider
import { ClerkProvider, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="border-b">
            <div className="container flex items-center justify-between py-4">
              <h1>VRP API Explorer</h1>

              <div className="flex items-center gap-4">
                <TierBadge />
                <SignInButton mode="modal">
                  <Button variant="outline">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button>Sign Up Free</Button>
                </SignUpButton>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </header>

          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

---

### 9. Upgrade Interception in UI

```typescript
// components/VrpJsonEditor.tsx - Intercept large problems
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { UpgradePrompt } from './auth/UpgradePrompt';

export function VrpJsonEditor({ value, onChange }: Props) {
  const { user } = useUser();
  const tier = user?.publicMetadata?.tier || 'anonymous';
  const limits = getTierLimits(tier);

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(value);
      const jobCount = parsed.jobs?.length || 0;
      const resourceCount = parsed.resources?.length || 0;

      if (jobCount > limits.vrp.maxJobs || resourceCount > limits.vrp.maxResources) {
        setShowUpgradePrompt(true);
      } else {
        setShowUpgradePrompt(false);
      }
    } catch {
      // Invalid JSON, ignore
    }
  }, [value, limits]);

  return (
    <div>
      {showUpgradePrompt && (
        <UpgradePrompt
          feature="Large VRP problems"
          currentTier={tier === 'anonymous' ? 'anonymous' : 'free'}
          targetTier={tier === 'anonymous' ? 'free' : 'pro'}
        />
      )}

      <MonacoEditor
        value={value}
        onChange={onChange}
        // ... other props
      />
    </div>
  );
}
```

---

## Implementation Phases

### Phase 1: Authentication Foundation (Week 1)
**Effort**: 8-12 hours

- [ ] Install & configure Clerk
- [ ] Create user profile model
- [ ] Implement tier configuration
- [ ] Add sign-up/sign-in UI
- [ ] Store tier in user metadata

**Outcome**: Users can create accounts, tier is tracked

---

### Phase 2: Tier Enforcement (Week 2)
**Effort**: 12-16 hours

- [ ] Build tier-enforcement middleware
- [ ] Update VRP API route with complexity checks
- [ ] Update OpenAI API route with usage tracking
- [ ] Implement tier-aware rate limiter
- [ ] Add usage tracking (hourly/daily resets)

**Outcome**: Limits enforced, anonymous users blocked from advanced features

---

### Phase 3: UI/UX Enhancements (Week 3)
**Effort**: 8-12 hours

- [ ] Tier badge component
- [ ] Usage indicator dashboard
- [ ] Upgrade prompts (contextual)
- [ ] Pricing page
- [ ] Email notifications for limit warnings

**Outcome**: Users understand their tier, prompted to upgrade at right moments

---

### Phase 4: Monetization (Week 4)
**Effort**: 8-12 hours

- [ ] Stripe integration for Pro tier
- [ ] Subscription management
- [ ] Billing portal
- [ ] Upgrade/downgrade flows
- [ ] Webhook handlers for payment events

**Outcome**: Users can pay for Pro tier, revenue flowing

---

## Conversion Funnel Optimization

### Anonymous → Free (Primary Goal)

**Trigger Points** (show sign-up modal):
1. After 3 VRP solves: "You've tried 3 problems. Sign up to save your work!"
2. When hitting job limit: "Need more than 20 jobs? Sign up for 100!"
3. Trying to upload CSV: "CSV upload requires free account (30 seconds to sign up)"
4. After 10 minutes active: "Enjoying the demo? Save your progress with a free account"

**Friction Reduction**:
- Social OAuth (Google, GitHub) = 1-click sign-up
- No credit card required
- Immediate access after sign-up (no email verification required)

### Free → Pro (Revenue Goal)

**Trigger Points**:
1. After 50 VRP solves in free tier: "Heavy user? Upgrade to Pro for unlimited"
2. Hitting 100 job limit multiple times: "Need production-scale? Upgrade to Pro"
3. Daily AI budget exhausted: "Out of AI requests. Pro gets 10x more + priority"
4. Using advanced features regularly: "Power user detected. Pro unlocks unlimited Code Interpreter"

**Incentives**:
- 14-day free trial of Pro
- Volume discounts for annual billing
- White-glove onboarding for Pro users

---

## Analytics to Track

```typescript
// Track these metrics in PostHog, Mixpanel, or similar

// Conversion funnel
analytics.track('Demo_Started', { tier: 'anonymous' });
analytics.track('Sign_Up_Prompted', { trigger: 'job_limit_hit' });
analytics.track('Sign_Up_Completed', { method: 'google_oauth' });
analytics.track('Upgrade_Prompted', { from: 'free', to: 'pro', trigger: 'ai_budget_exhausted' });
analytics.track('Upgrade_Completed', { plan: 'pro_monthly' });

// Usage patterns
analytics.track('VRP_Solved', { jobCount, resourceCount, tier });
analytics.track('AI_Request', { model, tokens, cost, tier });
analytics.track('Limit_Hit', { limitType: 'vrp_jobs', tier });

// Feature engagement
analytics.track('CSV_Uploaded', { fileSize, tier });
analytics.track('Code_Interpreter_Used', { tier });
```

---

## Cost Projections with Tiers

### Scenario: 1000 monthly visitors

**Anonymous Users** (70% = 700 users):
- Avg 5 requests/user × 700 = 3,500 requests
- At gpt-4o-mini: 3,500 × $0.001 = **$3.50/month**

**Free Users** (25% = 250 users):
- Avg 20 requests/user × 250 = 5,000 requests
- At gpt-4o-mini: 5,000 × $0.001 = **$5/month**
- Plus daily budget cap = **$5/day max = $150/month**

**Pro Users** (5% = 50 users):
- Avg 100 requests/user × 50 = 5,000 requests
- At gpt-4o: 5,000 × $0.005 = **$25/month**
- Revenue: 50 users × $49/month = **$2,450/month**

**Total AI Cost**: ~$180/month
**Total Revenue**: $2,450/month
**Net Margin**: **$2,270/month** (93%)

---

## Summary

This tiered approach gives you:

1. **Risk Protection**: Anonymous users tightly limited
2. **Lead Generation**: Every limit hit = upgrade prompt
3. **User Incentive**: Clear value in signing up/upgrading
4. **Monetization Path**: Pro tier with compelling features
5. **Cost Control**: Budgets per tier prevent runaway spending

**Next Steps**:
1. Choose auth provider (recommend Clerk)
2. Define exact tier limits (adjust my suggestions)
3. Implement Phase 1 (auth foundation)
4. A/B test upgrade prompt timing/messaging

Want me to start implementing the authentication foundation?