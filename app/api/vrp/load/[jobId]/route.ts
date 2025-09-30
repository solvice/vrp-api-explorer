import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters, createRateLimitHeaders } from '@/lib/rate-limiter'
import { SolviceVrpSolver } from 'solvice-vrp-solver'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Apply rate limiting
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
      return NextResponse.json(
        { error: 'No API key provided' },
        { status: 401 }
      )
    }

    const { jobId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i
    if (!uuidRegex.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      )
    }

    // Initialize SDK client
    const client = new SolviceVrpSolver({ apiKey: apiKey })

    // Fetch request, solution, and explanation simultaneously using SDK
    const [requestResponse, solutionResponse, explanationResponse] = await Promise.allSettled([
      client.vrp.jobs.retrieve(jobId),
      client.vrp.jobs.solution(jobId),
      client.vrp.jobs.explanation(jobId)
    ])

    // Handle request fetch result
    let requestData = null
    if (requestResponse.status === 'fulfilled') {
      requestData = requestResponse.value
    } else {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Handle solution fetch result (may not exist yet)
    let solutionData = null
    let solutionError = null

    if (solutionResponse.status === 'fulfilled') {
      solutionData = solutionResponse.value
    } else {
      // Check if it's a 404 (solution not ready) or other error
      const error = solutionResponse.reason
      if (error?.status === 404) {
        solutionError = 'Solution not ready yet'
      } else {
        solutionError = 'Failed to fetch solution'
      }
    }

    // Handle explanation fetch result (may not exist yet)
    let explanationData = null
    let explanationError = null

    if (explanationResponse.status === 'fulfilled') {
      explanationData = explanationResponse.value
    } else {
      // Check if it's a 404 (explanation not ready) or other error
      const error = explanationResponse.reason
      if (error?.status === 404) {
        explanationError = 'Explanation not ready yet'
      } else {
        explanationError = 'Failed to fetch explanation'
      }
    }

    return NextResponse.json({
      request: requestData,
      solution: solutionData,
      solutionError,
      explanation: explanationData,
      explanationError
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    })

  } catch (error) {
    console.error('Job loading error:', error)
    return NextResponse.json(
      { error: 'Failed to load job' },
      { status: 500 }
    )
  }
}