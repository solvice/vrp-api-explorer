import { NextRequest, NextResponse } from 'next/server'
import { SolviceVrpSolver } from 'solvice-vrp-solver'
import { rateLimiters, createRateLimitHeaders } from '@/lib/rate-limiter'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting - 30 requests per 10 minutes
    const rateLimitResult = rateLimiters.vrp(request)

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

    // Get API key from request headers or server-side environment
    const authHeader = request.headers.get('authorization')
    const apiKey = authHeader?.replace('Bearer ', '') || process.env.SOLVICE_API_KEY

    if (!apiKey) {
      console.error('❌ Solvice API key not found in environment variables or headers')
      return NextResponse.json(
        { error: 'No API key provided', type: 'authentication' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Initialize Solvice client
    const client = new SolviceVrpSolver({
      apiKey: apiKey
    })

    // Get the explanation for the job
    const response = await client.vrp.jobs.explanation(id)

    return NextResponse.json(response, {
      headers: createRateLimitHeaders(rateLimitResult)
    })

  } catch (error: unknown) {
    console.error('VRP Explanation API Error:', error)

    // Handle different error types
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage?.includes('unauthorized') || errorMessage?.includes('authentication')) {
      return NextResponse.json(
        { error: 'Invalid API key', type: 'authentication' },
        { status: 401 }
      )
    }

    if (errorMessage?.includes('not found')) {
      return NextResponse.json(
        { error: 'Job not found', type: 'validation' },
        { status: 404 }
      )
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error', type: 'server' },
      { status: 500 }
    )
  }
}