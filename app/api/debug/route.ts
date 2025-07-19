import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check environment variables (safely, without exposing keys)
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY
    const hasSolviceKey = !!process.env.SOLVICE_API_KEY
    
    // Also check for any legacy environment variables
    const hasLegacyOpenAIKey = !!process.env.NEXT_PUBLIC_OPENAI_API_KEY
    const hasLegacySolviceKey = !!process.env.NEXT_PUBLIC_SOLVICE_API_KEY

    return NextResponse.json({
      environment: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      keys: {
        openai: hasOpenAIKey,
        solvice: hasSolviceKey,
        legacy_openai: hasLegacyOpenAIKey,
        legacy_solvice: hasLegacySolviceKey
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Debug check failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}