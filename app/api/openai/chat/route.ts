import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { rateLimiters, createRateLimitHeaders } from '@/lib/rate-limiter'
import { costGuardian } from '@/lib/cost-guardian'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting - 10 requests per 10 minutes
    const rateLimitResult = rateLimiters.openai(request)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait before making more requests.',
          type: 'rate_limit',
          resetTime: rateLimitResult.resetTime
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      )
    }
    // Get API key from server-side environment variable only
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.error('❌ OpenAI API key not found in environment variables')
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('OPENAI')))
      return NextResponse.json(
        { error: 'OpenAI API key not configured on server' },
        { status: 500 }
      )
    }

    // Parse request body
    const { messages, model = 'gpt-4o', max_tokens = 2000, temperature = 0.3, response_format } = await request.json()

    // Check daily budget before making expensive OpenAI call
    // Conservative estimate: ~$0.05 for gpt-4o request
    const estimatedCost = model === 'gpt-4o' ? 0.05 : 0.01
    const budgetCheck = costGuardian.checkBudget(estimatedCost)

    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          error: budgetCheck.reason,
          type: 'budget_exceeded',
          currentSpend: budgetCheck.currentSpend,
          budgetLimit: budgetCheck.budgetLimit,
        },
        { status: 429 }
      )
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      )
    }

    // Initialize OpenAI client on server-side
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    // Make the OpenAI API call
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature,
      ...(response_format && { response_format })
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'Invalid response format from OpenAI API' },
        { status: 500 }
      )
    }

    // Record actual cost after successful call
    if (completion.usage) {
      const MODEL_PRICING = {
        'gpt-4o': { input: 2.50, output: 10.00 },
        'gpt-4o-mini': { input: 0.15, output: 0.60 },
      };

      const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING['gpt-4o'];
      const actualCost = (
        (completion.usage.prompt_tokens * pricing.input / 1_000_000) +
        (completion.usage.completion_tokens * pricing.output / 1_000_000)
      );

      costGuardian.recordCost(actualCost);

      console.log(`💰 OpenAI request: ${completion.usage.total_tokens} tokens, $${actualCost.toFixed(4)}`);
    }

    return NextResponse.json({
      content,
      usage: completion.usage,
      budget: {
        remaining: budgetCheck.budgetRemaining,
        limit: budgetCheck.budgetLimit,
      }
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    })

  } catch (error: unknown) {
    console.error('OpenAI API Error:', error)

    // Handle different error types
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { 
          error: `OpenAI API error: ${error.message}`, 
          type: 'openai_api_error',
          status: error.status 
        },
        { status: error.status || 500 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    
    if (errorMessage?.includes('unauthorized') || errorMessage?.includes('authentication')) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key', type: 'authentication' },
        { status: 401 }
      )
    }

    if (errorMessage?.includes('rate limit')) {
      return NextResponse.json(
        { error: 'OpenAI rate limit exceeded', type: 'rate_limit' },
        { status: 429 }
      )
    }

    if (errorMessage?.includes('timeout')) {
      return NextResponse.json(
        { error: 'OpenAI request timeout', type: 'timeout' },
        { status: 408 }
      )
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error', type: 'server' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}