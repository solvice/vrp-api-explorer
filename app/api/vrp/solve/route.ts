import { NextRequest, NextResponse } from 'next/server'
import { SolviceVrpSolver } from 'solvice-vrp-solver'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { rateLimiters, createRateLimitHeaders } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
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
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('SOLVICE')))
      console.error('Has auth header:', !!authHeader)
      return NextResponse.json(
        { error: 'No API key provided' },
        { status: 401 }
      )
    }

    // Parse request body
    const requestData: Vrp.VrpSyncSolveParams = await request.json()

    // Initialize Solvice client
    const client = new SolviceVrpSolver({
      apiKey: apiKey
    })

    // Make the VRP solve request
    const response = await client.vrp.syncSolve(requestData)

    return NextResponse.json(response, {
      headers: createRateLimitHeaders(rateLimitResult)
    })

  } catch (error: unknown) {
    console.error('VRP API Error:', error)

    // Handle different error types
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage?.includes('unauthorized') || errorMessage?.includes('authentication')) {
      return NextResponse.json(
        { error: 'Invalid API key', type: 'authentication' },
        { status: 401 }
      )
    }

    if (errorMessage?.includes('validation') || errorMessage?.includes('invalid')) {
      return NextResponse.json(
        { error: 'Invalid request data', type: 'validation' },
        { status: 400 }
      )
    }

    if (errorMessage?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Request timeout', type: 'timeout' },
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