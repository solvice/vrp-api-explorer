import { NextRequest, NextResponse } from 'next/server'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

interface ReorderRequest {
  jobId: string              // Job being moved
  afterJobId: string | null  // Job to insert after (null = first position)
  operation: 'evaluate' | 'solve'  // Fast preview vs full re-optimization
  originalSolutionId: string       // ID from original solve response
}

interface ReorderResponse {
  solution: Vrp.OnRouteResponse
  scoreComparison?: {
    original: number
    modified: number
    delta: number
    deltaPercent: number
  }
  feasibilityWarnings?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.SOLVICE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured', type: 'authentication' },
        { status: 401 }
      )
    }

    const body: ReorderRequest = await request.json()
    const { jobId, afterJobId, operation, originalSolutionId } = body

    // Construct change specification for Solvice Change API
    const changeSpec = {
      changes: [
        {
          job: jobId,
          after: afterJobId,
          // arrival time is optional - let solver optimize if not specified
        }
      ],
      operation: operation  // 'evaluate' for preview, 'solve' for final
    }

    // Call the Solvice VRP Change API
    // POST /v2/vrp/sync/jobs/{originalSolutionId}/change
    const response = await fetch(
      `https://api.solvice.io/v2/vrp/sync/jobs/${originalSolutionId}/change`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changeSpec)
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
      return NextResponse.json(
        {
          error: errorData.error || 'Change API request failed',
          type: response.status === 401 ? 'authentication' : 'server'
        },
        { status: response.status }
      )
    }

    const newSolution: Vrp.OnRouteResponse = await response.json()

    // Extract feasibility warnings from solution
    const feasibilityWarnings = extractFeasibilityWarnings(newSolution)

    // Calculate score comparison if available
    // Note: Score is typically in the solution's cost or objective field
    const scoreComparison = calculateScoreComparison(newSolution, originalSolutionId)

    return NextResponse.json({
      solution: newSolution,
      scoreComparison,
      feasibilityWarnings
    } as ReorderResponse)

  } catch (error) {
    console.error('VRP reorder error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to reorder jobs',
        type: 'unknown'
      },
      { status: 500 }
    )
  }
}

function extractFeasibilityWarnings(solution: Vrp.OnRouteResponse): string[] {
  const warnings: string[] = []

  // Check for constraint violations in solution
  solution.trips?.forEach(trip => {
    trip.visits?.forEach(visit => {
      // Note: The actual field name may differ - check Solvice API docs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const violations = (visit as any).violatedConstraints || (visit as any).violations || []
      if (violations.length > 0) {
        warnings.push(
          `Job ${visit.job}: ${violations.join(', ')}`
        )
      }
    })
  })

  // Check for unassigned jobs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unassigned = (solution as any).unassigned || []
  if (unassigned.length > 0) {
    warnings.push(`${unassigned.length} unassigned jobs`)
  }

  return warnings
}

function calculateScoreComparison(
  _newSolution: Vrp.OnRouteResponse,
  _originalSolutionId: string
): ReorderResponse['scoreComparison'] {
  // TODO: Implement score caching to compare with original
  // For now, return undefined - would need to store original solution scores
  // in a cache (Redis, in-memory, etc.) keyed by solution ID

  // The score/objective value would typically be in:
  // - solution.cost
  // - solution.objective
  // - solution.score
  // Check Solvice API documentation for exact field name

  return undefined
}