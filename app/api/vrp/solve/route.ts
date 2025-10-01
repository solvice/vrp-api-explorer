import { NextRequest, NextResponse } from 'next/server'
import { SolviceVrpSolver } from 'solvice-vrp-solver'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { rateLimiters, createRateLimitHeaders } from '@/lib/rate-limiter'
import { validateComplexity, getComplexityErrorMessage } from '@/lib/vrp-complexity-validator'
import { sanitizeVrpInput } from '@/lib/input-sanitizer'

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
    const rawRequestData: Vrp.VrpSyncSolveParams = await request.json()

    // Sanitize input to prevent injection attacks
    const sanitizationResult = sanitizeVrpInput(rawRequestData)

    if (!sanitizationResult.valid) {
      return NextResponse.json(
        {
          error: 'Invalid VRP data',
          message: 'Input validation failed',
          type: 'validation_error',
          details: {
            errors: sanitizationResult.errors,
            warnings: sanitizationResult.warnings,
          }
        },
        { status: 400 }
      )
    }

    // Log warnings
    if (sanitizationResult.warnings.length > 0) {
      console.warn('⚠️  VRP input warnings:', sanitizationResult.warnings)
    }

    // Use sanitized data
    const requestData = sanitizationResult.sanitized!

    // Validate complexity before solving
    const complexityCheck = validateComplexity(requestData)

    if (!complexityCheck.valid) {
      const errorMessage = getComplexityErrorMessage(complexityCheck)

      return NextResponse.json(
        {
          error: errorMessage,
          type: 'complexity_limit',
          details: {
            errors: complexityCheck.errors,
            warnings: complexityCheck.warnings,
            actualComplexity: complexityCheck.actualComplexity,
          }
        },
        { status: 400 }
      )
    }

    // Log warnings if approaching limits
    if (complexityCheck.warnings.length > 0) {
      console.warn('⚠️  VRP complexity warnings:', complexityCheck.warnings)
    }

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