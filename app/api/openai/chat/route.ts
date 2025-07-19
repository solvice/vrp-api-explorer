import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({
      content,
      usage: completion.usage
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