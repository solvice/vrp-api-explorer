import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export interface ExecutionLog {
  id: string
  stepNumber: number
  type: 'code_interpreter'
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'expired'
  input?: string
  outputs?: Array<{
    type: 'logs' | 'image' | 'error'
    content: string
  }>
  createdAt: number
  completedAt?: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')
    const runId = searchParams.get('runId')

    if (!threadId || !runId) {
      return NextResponse.json(
        { error: 'Missing threadId or runId parameters' },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching execution logs for:', { threadId, runId })

    // Fetch run steps from OpenAI - needs both runId and thread_id in params
    const steps = await openai.beta.threads.runs.steps.list(runId, {
      thread_id: threadId,
      limit: 20
    })

    // Transform steps into our ExecutionLog format
    const executionLogs: ExecutionLog[] = steps.data.map((step, index) => {
      const log: ExecutionLog = {
        id: step.id,
        stepNumber: index + 1,
        type: 'code_interpreter',
        status: step.status,
        createdAt: step.created_at,
        completedAt: step.completed_at || undefined
      }

      // Extract code interpreter details
      if (step.step_details.type === 'tool_calls') {
        const toolCall = step.step_details.tool_calls[0]
        if (toolCall.type === 'code_interpreter') {
          log.input = toolCall.code_interpreter.input
          log.outputs = toolCall.code_interpreter.outputs?.map(output => {
            if (output.type === 'logs') {
              return {
                type: 'logs',
                content: output.logs
              }
            } else if (output.type === 'image') {
              return {
                type: 'image',
                content: output.image.file_id
              }
            }
            return {
              type: 'error',
              content: 'Unknown output type'
            }
          }) || []
        }
      }

      return log
    })

    console.log(`✅ Returning ${executionLogs.length} execution logs`)

    return NextResponse.json({
      success: true,
      logs: executionLogs,
      totalSteps: executionLogs.length
    })

  } catch (error: unknown) {
    console.error('❌ Failed to fetch execution logs:', error)

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        {
          error: 'OpenAI API error',
          message: error.message,
          type: error.type
        },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch execution logs' },
      { status: 500 }
    )
  }
}