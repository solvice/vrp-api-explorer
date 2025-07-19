import { NextRequest, NextResponse } from 'next/server'
import { SolviceVrpSolver } from 'solvice-vrp-solver'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

export async function POST(request: NextRequest) {
  try {
    // Get API key from request headers or server-side environment
    const authHeader = request.headers.get('authorization')
    const apiKey = authHeader?.replace('Bearer ', '') || process.env.SOLVICE_API_KEY

    if (!apiKey) {
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

    return NextResponse.json(response)

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