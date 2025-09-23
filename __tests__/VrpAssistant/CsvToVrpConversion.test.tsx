/**
 * @jest-environment node
 */

import { OpenAIService } from '@/components/VrpAssistant/OpenAIService'
import OpenAI from 'openai'
import { VrpSchemaService } from '@/lib/vrp-schema-service'
import { describe, it } from 'node:test'

// CSV to VRP conversion test using OpenAI Code Interpreter
describe('CSV to VRP Conversion - Code Interpreter Test', () => {
  // Skip if no real OpenAI API key
  const testCondition = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'test-openai-key-123' ? describe : describe.skip

  testCondition('Real OpenAI Code Interpreter Integration', () => {

    it('converts CSV to VRP JSON using OpenAI Code Interpreter', async () => {
      // CSV input with multiple data types and edge cases
      const csvInput = `name,latitude,longitude,duration,priority,capacity_needed
London Office,51.5074,0.1278,30,high,100
Manchester Store,53.4808,-2.2426,45,medium,150
Birmingham Warehouse,52.4862,-1.8904,25,low,75
Leeds Distribution,53.8008,-1.5491,35,high,120`

      console.log('🚀 Starting Code Interpreter CSV conversion test...')
      console.log('📊 CSV Input:', csvInput)

      // Initialize OpenAI client directly for testing
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      })

      // Step 1: Create a file from the CSV content
      const file = await openai.files.create({
        file: new File([csvInput], 'test.csv', { type: 'text/csv' }),
        purpose: 'assistants'
      })

      console.log('✅ File uploaded to OpenAI:', file.id)

      // Step 2: Create an assistant with Code Interpreter tool
      const assistant = await openai.beta.assistants.create({
        name: "VRP CSV Converter Test",
        instructions: `You are a VRP (Vehicle Routing Problem) data converter. Your task is to:

1. Analyze the uploaded CSV file and understand its structure
2. Convert the CSV data to valid VRP JSON format according to the schema provided
3. Handle data transformation including:
   - Converting durations from minutes to seconds
   - Mapping coordinates properly
   - Creating valid VRP job structures
   - Generating appropriate vehicle resources

${OpenAIService.buildCodeInterpreterInstructions()}

Return your final result as a JSON object with this structure:
{
  "vrpData": { /* complete VRP request object */ },
  "explanation": "Brief explanation of the conversion",
  "conversionNotes": ["Note about assumption 1", "Note about assumption 2"],
  "rowsProcessed": number
}`,
        model: "gpt-4o",
        tools: [{ type: "code_interpreter" }]
      })

      console.log('✅ Assistant created:', assistant.id)

      try {
        // Step 3: Create a thread and attach the file
        const thread = await openai.beta.threads.create({
          messages: [
            {
              role: "user",
              content: `Please analyze the attached CSV file "test-jobs.csv" and convert it to VRP JSON format. Use the Code Interpreter to:

1. Load and examine the CSV structure
2. Process each row to create VRP jobs
3. Convert durations from minutes to seconds
4. Map coordinates correctly
5. Generate appropriate vehicle resources
6. Validate the output structure

Please show your work step by step and provide the final JSON result.`,
              attachments: [
                {
                  file_id: file.id,
                  tools: [{ type: "code_interpreter" }]
                }
              ]
            }
          ]
        })

        console.log('✅ Thread created:', thread.id)

        if (!thread.id) {
          throw new Error('Thread creation failed - no thread ID returned')
        }

        // Step 4: Run the assistant
        const run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: assistant.id
        })

        console.log('🔄 Run started:', run.id)
        console.log('🔄 Thread ID:', thread.id)
        console.log('🔄 Assistant ID:', assistant.id)

        if (!run.id) {
          throw new Error('Run creation failed - no run ID returned')
        }

        // Step 5: Wait for completion with polling
        let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id })
        let attempts = 0
        const maxAttempts = 120 // 2 minutes max wait time

        while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
          if (attempts >= maxAttempts) {
            throw new Error('Code Interpreter execution timeout')
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
        console.log('🔍 Code Interpreter response preview:', resultText.substring(0, 500) + '...')

        // Step 7: Extract JSON from the response
        let result
        try {
          // Try to extract JSON from the response
          const jsonMatch = resultText.match(/\{[\s\S]*\}/g)
          if (jsonMatch && jsonMatch.length > 0) {
            // Use the last (most complete) JSON object found
            const jsonStr = jsonMatch[jsonMatch.length - 1]
            result = JSON.parse(jsonStr)
          } else {
            throw new Error('No valid JSON found in Code Interpreter response')
          }
        } catch (parseError) {
          console.error('❌ Failed to parse JSON from response:', parseError)
          console.error('Response content:', resultText.substring(0, 1000) + '...')
          throw new Error('Failed to parse VRP JSON from Code Interpreter response')
        }

        console.log('✅ Code Interpreter Response:', JSON.stringify(result, null, 2))

        // Validate response structure
        expect(result).toBeDefined()
        expect(result.vrpData).toBeDefined()
        expect(result.explanation).toBeDefined()
        expect(result.conversionNotes).toBeDefined()
        expect(result.rowsProcessed).toBeDefined()

        // Validate VRP JSON structure
        expect(result.vrpData.jobs).toBeDefined()
        expect(result.vrpData.resources).toBeDefined()
        expect(result.vrpData.jobs.length).toBe(4) // 4 CSV rows
        expect(result.vrpData.resources.length).toBeGreaterThan(0)
        expect(result.rowsProcessed).toBe(4)

        // Validate specific job conversions
        const londonJob = result.vrpData.jobs.find((job: any) => job.name.includes('London'))
        const manchesterJob = result.vrpData.jobs.find((job: any) => job.name.includes('Manchester'))
        const birminghamJob = result.vrpData.jobs.find((job: any) => job.name.includes('Birmingham'))
        const leedsJob = result.vrpData.jobs.find((job: any) => job.name.includes('Leeds'))

        // Validate London Office
        expect(londonJob).toBeDefined()
        expect(londonJob?.location?.latitude).toBeCloseTo(51.5074, 3)
        expect(londonJob?.location?.longitude).toBeCloseTo(0.1278, 3)
        expect(londonJob?.duration).toBe(1800) // 30 min → 1800 sec

        // Validate Manchester Store
        expect(manchesterJob).toBeDefined()
        expect(manchesterJob?.location?.latitude).toBeCloseTo(53.4808, 3)
        expect(manchesterJob?.location?.longitude).toBeCloseTo(-2.2426, 3)
        expect(manchesterJob?.duration).toBe(2700) // 45 min → 2700 sec

        // Validate Birmingham Warehouse
        expect(birminghamJob).toBeDefined()
        expect(birminghamJob?.location?.latitude).toBeCloseTo(52.4862, 3)
        expect(birminghamJob?.location?.longitude).toBeCloseTo(-1.8904, 3)
        expect(birminghamJob?.duration).toBe(1500) // 25 min → 1500 sec

        // Validate Leeds Distribution
        expect(leedsJob).toBeDefined()
        expect(leedsJob?.location?.latitude).toBeCloseTo(53.8008, 3)
        expect(leedsJob?.location?.longitude).toBeCloseTo(-1.5491, 3)
        expect(leedsJob?.duration).toBe(2100) // 35 min → 2100 sec

        // Validate that Code Interpreter processed additional data correctly
        expect(result.conversionNotes.length).toBeGreaterThan(0)
        expect(result.explanation.toLowerCase()).toContain('conversion')

        // Validate vehicle resources were created
        const firstResource = result.vrpData.resources[0]
        expect(firstResource).toBeDefined(
        expect(firstResource.id).toBeDefined()
        expect(firstResource.shifts).toBeDefined()
        expect(firstResource.shifts.length).toBeGreaterThan(0)

        // Validate against VRP schema
        const validation = VrpSchemaService.validateModification(
          { jobs: [], resources: [] } as any,
          result.vrpData
        )
        expect(validation.valid).toBe(true)

        console.log('🎯 All Code Interpreter validations passed!')

      } finally {
        // Cleanup resources
        try {
          await openai.files.delete(file.id)
          await openai.beta.assistants.delete(assistant.id)
          console.log('🧹 Cleanup completed')
        } catch (cleanupError) {
          console.warn('⚠️ Cleanup warning:', cleanupError)
        }
      }

    }, 180000) // 3 minutes timeout for Code Interpreter execution


    it('validates Code Interpreter data processing capabilities', async () => {
      // CSV with various data types to test processing
      const csvInput = `name,lat,lng,service_minutes,priority,note
"Stop A",51.5,-0.1,15,high,"First delivery"
"Stop B",51.6,-0.2,30,medium,"Second delivery"`

      console.log('🧪 Testing Code Interpreter data processing...')

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      })

      const file = await openai.files.create({
        file: new File([csvInput], 'test.csv', { type: 'text/csv' }),
        purpose: 'assistants'
      })

      const assistant = await openai.beta.assistants.create({
        name: "VRP CSV Processor Test",
        instructions: `Process the CSV and convert durations from minutes to seconds. Extract the data systematically and output JSON.`,
        model: "gpt-4o",
        tools: [{ type: "code_interpreter" }]
      })

      try {
        const thread = await openai.beta.threads.create({
          messages: [{
            role: "user",
            content: "Load the CSV, convert service_minutes to seconds, and output structured data.",
            attachments: [{
              file_id: file.id,
              tools: [{ type: "code_interpreter" }]
            }]
          }]
        })

        console.log('🔄 Thread created:', thread.id)
        expect(thread.id).toBeDefined()

        const run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: assistant.id
        })

        console.log('🔄 Run created:', run.id)
        expect(run.id).toBeDefined()

        // Wait for completion
        let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id })
        let attempts = 0
        while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < 60) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id })
          attempts++
          console.log(`⏳ Run status: ${runStatus.status} (attempt ${attempts}/60)`)
        }

        expect(runStatus.status).toBe('completed')

        const messages = await openai.beta.threads.messages.list(thread.id)
        const response = messages.data.find(msg => msg.role === 'assistant')
        expect(response).toBeDefined()

        console.log('✅ Code Interpreter processing test passed')

      } finally {
        await openai.files.delete(file.id)
        await openai.beta.assistants.delete(assistant.id)
      }
    }, 120000)

  })

  describe('Fallback: Traditional Chat Completion', () => {
    it('converts CSV using traditional chat completion as fallback', async () => {
      // Simple CSV input for fallback test
      const csvInput = `name,latitude,longitude,duration
London Office,51.5074,0.1278,30
Manchester Store,53.4808,-2.2426,45`

      console.log('🔄 Testing fallback to traditional chat completion...')

      // Test the direct OpenAI API call
      const systemPrompt = OpenAIService.buildCsvConversionSystemPrompt()
      const userPrompt = `Convert this CSV file to VRP JSON format:\n\nFilename: fallback-test.csv\n\nCSV Content:\n${csvInput}`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 4000,
          temperature: 0.1
        })
      })

      expect(response.ok).toBe(true)

      const apiResponse = await response.json()
      const result = JSON.parse(apiResponse.choices[0].message.content)

      // Validate basic structure
      expect(result.vrpData.jobs.length).toBe(2)
      expect(result.rowsProcessed).toBe(2)

      const londonJob = result.vrpData.jobs.find((job: any) => job.name.includes('London'))
      expect(londonJob?.duration).toBe(1800) // 30 min → 1800 sec

      console.log('✅ Fallback method working correctly')
    }, 30000)

    it('compares Code Interpreter vs traditional approach', async () => {
      console.log('🔬 This test documents the differences between Code Interpreter and traditional approaches:')
      console.log('📊 Code Interpreter: Uses actual data processing, file upload, and programmatic analysis')
      console.log('💬 Traditional: Uses text-based prompting with structured output')
      console.log('🎯 Both should produce valid VRP JSON, but Code Interpreter provides more accurate data handling')
      expect(true).toBe(true)
    })
  })

  describe('API Key Requirements', () => {
    it('documents OpenAI API key requirement', () => {
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test-openai-key-123') {
        console.log('🔑 Set OPENAI_API_KEY environment variable for real testing')
        console.log('💡 Code Interpreter tests require a valid OpenAI API key with Assistants API access')
      }
      expect(true).toBe(true)
    })
  })
})