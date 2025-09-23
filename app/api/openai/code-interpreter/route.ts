import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { rateLimiters, createRateLimitHeaders } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting - 5 requests per 10 minutes for Code Interpreter
    const rateLimitResult = rateLimiters.openai(request)

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

    // Get API key from server-side environment variable only
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.error('❌ OpenAI API key not found in environment variables')
      return NextResponse.json(
        { error: 'OpenAI API key not configured on server' },
        { status: 500 }
      )
    }

    // Parse request body
    const { csvContent, filename, files, instructions } = await request.json()

    // Handle both single file (csvContent + filename) and multiple files (files array)
    const filesToProcess = files || (
      csvContent && filename
        ? [{ content: csvContent, name: filename }]
        : null
    )

    if (!filesToProcess || filesToProcess.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: either csvContent+filename or files array is required' },
        { status: 400 }
      )
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    console.log('🤖 Starting Code Interpreter workflow for CSV conversion...')
    console.log('📁 Files to process:', filesToProcess.length)
    if (filesToProcess.length === 1) {
      console.log('📁 Single file:', filesToProcess[0].name)
      console.log('📊 Content length:', filesToProcess[0].content.length)
    } else {
      console.log('📁 Multiple files:', filesToProcess.map((f: { name: string; content: string }) => f.name).join(', '))
      console.log('📊 Total content length:', filesToProcess.reduce((sum: number, f: { name: string; content: string }) => sum + f.content.length, 0))
    }

    // Step 1: Upload all files to OpenAI with enhanced error handling
    const uploadPromises = filesToProcess.map((fileData: { name: string; content: string }) =>
      openai.files.create({
        file: new File([fileData.content], fileData.name, { type: 'text/csv' }),
        purpose: 'assistants'
      }).catch(error => ({ error, fileName: fileData.name }))
    )

    const uploadResults = await Promise.all(uploadPromises)

    // Separate successful uploads from failures
    const successfulUploads = uploadResults.filter(result => !('error' in result)) as Array<{ id: string; [key: string]: unknown }>
    const failedUploads = uploadResults.filter(result => 'error' in result) as Array<{ error: Error; fileName: string }>

    if (failedUploads.length > 0) {
      // Clean up any successful uploads before failing
      await Promise.all(
        successfulUploads.map(file =>
          openai.files.delete(file.id).catch(err =>
            console.warn(`Failed to cleanup file ${file.id}:`, err)
          )
        )
      )

      const failedFileNames = failedUploads.map(f => f.fileName).join(', ')
      const errorMessages = failedUploads.map(f => `${f.fileName}: ${f.error.message}`).join('; ')
      throw new Error(`Failed to upload ${failedUploads.length} file(s): ${failedFileNames}. Details: ${errorMessages}`)
    }

    const uploadedFiles = successfulUploads
    console.log(`✅ ${uploadedFiles.length} file(s) uploaded to OpenAI:`, uploadedFiles.map(f => f.id))

    // Step 2: Create an assistant with Code Interpreter tool
    const assistant = await openai.beta.assistants.create({
      name: "VRP CSV Converter",
      instructions: `You are a VRP (Vehicle Routing Problem) data converter. Your task is to:

1. Analyze the uploaded CSV file and understand its structure
2. Convert the CSV data to valid VRP JSON format according to the schema provided
3. Handle data transformation including:
   - Converting durations from minutes to seconds
   - Mapping coordinates properly
   - Creating valid VRP job structures
   - Generating appropriate vehicle resources

${instructions || 'Use intelligent field mapping and create reasonable defaults for missing data.'}

Return your final result as a JSON object with this structure:
{
  "vrpData": { /* complete VRP request object */ },
  "explanation": "Brief explanation of the conversion",
  "conversionNotes": ["Note about assumption 1", "Note about assumption 2"],
  "rowsProcessed": number
}`,
      model: "gpt-4o-mini",
      tools: [{ type: "code_interpreter" }]
    })

    console.log('✅ Assistant created:', assistant.id)

    // Step 3: Create a thread and attach the file
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: filesToProcess.length === 1
            ? `Please analyze the attached CSV file "${filesToProcess[0].name}" and convert it to VRP JSON format. Use the Code Interpreter to:

1. Load and examine the CSV structure
2. Process each row to create VRP jobs
3. Convert durations from minutes to seconds
4. Map coordinates correctly
5. Generate appropriate vehicle resources
6. Validate the output structure

Please show your work step by step and provide the final JSON result.`
            : `Please analyze the ${filesToProcess.length} attached CSV files and merge them into a single VRP JSON format. Use the Code Interpreter to:

1. Load and examine all CSV files:
${filesToProcess.map((f: { name: string; content: string }) => `   - ${f.name}`).join('\n')}
2. Identify relationships between files (common IDs, location references, etc.)
3. Process files in logical order (locations → jobs → vehicles)
4. Merge data appropriately based on discovered relationships
5. Convert durations from minutes to seconds
6. Map coordinates correctly
7. Generate appropriate vehicle resources
8. Validate the final consolidated output structure

Please show your work step by step for each file and provide the final merged JSON result.`,
          attachments: uploadedFiles.map(file => ({
            file_id: file.id,
            tools: [{ type: "code_interpreter" }]
          }))
        }
      ]
    })

    console.log('✅ Thread created:', thread.id)

    if (!thread.id) {
      throw new Error('Thread creation failed - no thread ID returned')
    }

    // Step 4: Run the assistant
    const run = await openai.beta.threads.runs.create(
      thread.id,
      {
        assistant_id: assistant.id
      }
    )

    console.log('🔄 Run started:', run.id)
    console.log('🔄 Thread ID:', thread.id)
    console.log('🔄 Assistant ID:', assistant.id)

    if (!run.id) {
      throw new Error('Run creation failed - no run ID returned')
    }

    // Step 5: Wait for completion with polling (dynamic timeout based on file characteristics)
    const calculateTimeout = (files: Array<{ name: string; content: string }>) => {
      const totalSize = files.reduce((sum, f) => sum + f.content.length, 0)
      const baseTimeout = files.length === 1 ? 60 : 90 // Base: 1min single, 1.5min multi
      const sizeMultiplier = Math.ceil(totalSize / 50000) // Extra 30s per 50KB
      const fileCountMultiplier = Math.max(0, files.length - 3) * 15 // Extra 15s per file beyond 3
      return Math.min(baseTimeout + sizeMultiplier * 30 + fileCountMultiplier, 300) // Max 5 minutes
    }

    let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id })
    let attempts = 0
    const maxAttempts = calculateTimeout(filesToProcess)

    console.log(`⏱️ Dynamic timeout calculated: ${maxAttempts}s for ${filesToProcess.length} files (${filesToProcess.reduce((sum: number, f: { name: string; content: string }) => sum + f.content.length, 0)} total chars)`)

    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      if (attempts >= maxAttempts) {
        throw new Error(`Code Interpreter execution timeout processing ${filesToProcess.length} file(s)`)
      }

      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

      console.log(`⏳ Polling attempt ${attempts + 1}/${maxAttempts} - Thread: ${thread.id}, Run: ${run.id}`)
      runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id })
      attempts++

      console.log(`⏳ Run status: ${runStatus.status} (attempt ${attempts}/${maxAttempts})`)
    }

    if (runStatus.status === 'failed') {
      console.error('❌ Run failed:', runStatus.last_error)
      throw new Error(`Code Interpreter execution failed: ${runStatus.last_error?.message || 'Unknown error'}`)
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Unexpected run status: ${runStatus.status}`)
    }

    console.log('✅ Run completed successfully')

    // Step 6: Retrieve the messages
    const messages = await openai.beta.threads.messages.list(thread.id)
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant')

    if (!assistantMessage || !assistantMessage.content[0]) {
      throw new Error('No response from Code Interpreter')
    }

    const responseContent = assistantMessage.content[0]
    let resultText = ''

    if (responseContent.type === 'text') {
      resultText = responseContent.text.value
    } else {
      throw new Error('Unexpected response type from Code Interpreter')
    }

    console.log('📝 Code Interpreter response length:', resultText.length)

    // Step 7: Clean up resources
    try {
      // Delete all uploaded files
      await Promise.all(uploadedFiles.map(file =>
        openai.files.delete(file.id).catch(err =>
          console.warn(`⚠️ Failed to delete file ${file.id}:`, err)
        )
      ))
      await openai.beta.assistants.delete(assistant.id)
      console.log('🧹 Cleanup completed for all files')
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError)
      // Don't fail the request due to cleanup issues
    }

    // Step 8: Extract JSON from the response
    let vrpResult
    try {
      // Try to extract JSON from the response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/g)
      if (jsonMatch && jsonMatch.length > 0) {
        // Use the last (most complete) JSON object found
        const jsonStr = jsonMatch[jsonMatch.length - 1]
        vrpResult = JSON.parse(jsonStr)
      } else {
        throw new Error('No valid JSON found in Code Interpreter response')
      }
    } catch (parseError) {
      console.error('❌ Failed to parse JSON from response:', parseError)
      console.error('Response content:', resultText.substring(0, 500) + '...')
      throw new Error('Failed to parse VRP JSON from Code Interpreter response')
    }

    // Fetch execution metadata for lazy loading
    let stepCount = 0
    try {
      const steps = await openai.beta.threads.runs.steps.list(run.id, {
        thread_id: thread.id,
        limit: 10
      })
      stepCount = steps.data.length
      console.log(`📊 Found ${stepCount} execution steps for lazy loading`)
    } catch (stepError) {
      console.warn('⚠️ Could not fetch step count:', stepError)
    }

    return NextResponse.json({
      success: true,
      result: vrpResult,
      rawResponse: resultText,
      fileId: uploadedFiles[0].id, // Keep for backwards compatibility
      runId: run.id,
      filesProcessed: filesToProcess.length,
      executionMetadata: {
        threadId: thread.id,
        runId: run.id,
        stepCount,
        hasLogs: stepCount > 0
      }
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    })

  } catch (error: unknown) {
    console.error('Code Interpreter API Error:', error)

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
        { error: 'Code Interpreter execution timeout', type: 'timeout' },
        { status: 408 }
      )
    }

    // Generic server error
    return NextResponse.json(
      { error: `Code Interpreter error: ${errorMessage}`, type: 'server' },
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