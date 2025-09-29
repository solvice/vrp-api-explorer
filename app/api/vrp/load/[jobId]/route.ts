import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters, createRateLimitHeaders } from '@/lib/rate-limiter'

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

    // Fetch request and solution simultaneously
    const [requestResponse, solutionResponse] = await Promise.allSettled([
      fetch(`https://api.solvice.io/v2/vrp/${jobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }),
      fetch(`https://api.solvice.io/v2/vrp/${jobId}/solution`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
    ])

    // Handle request fetch result
    let requestData = null
    if (requestResponse.status === 'fulfilled' && requestResponse.value.ok) {
      requestData = await requestResponse.value.json()
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
      if (solutionResponse.value.ok) {
        solutionData = await solutionResponse.value.json()
      } else if (solutionResponse.value.status === 404) {
        solutionError = 'Solution not ready yet'
      } else {
        solutionError = 'Failed to fetch solution'
      }
    } else {
      solutionError = 'Solution fetch failed'
    }

    return NextResponse.json({
      request: requestData,
      solution: solutionData,
      solutionError
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