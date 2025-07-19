import { OpenAIService, VrpModificationRequest, VrpModificationResponse } from '../../components/VrpAssistant/OpenAIService'
import { getSampleVrpData } from '../../lib/sample-data'
import { VrpSchemaService } from '../../lib/vrp-schema-service'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

// Mock fetch for testing
global.fetch = jest.fn()

describe('OpenAIService VRP Integration', () => {
  let openAIService: OpenAIService
  let sampleData: Vrp.VrpSyncSolveParams

  beforeEach(() => {
    process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'test-api-key'
    openAIService = new OpenAIService()
    sampleData = getSampleVrpData('simple')
    jest.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_OPENAI_API_KEY
  })

  describe('VRP Schema Integration', () => {
    it('should build comprehensive VRP system prompt', () => {
      const systemPrompt = (openAIService as any).buildVrpSystemPrompt()
      
      expect(systemPrompt).toContain('VRP (Vehicle Routing Problem) optimization assistant')
      expect(systemPrompt).toContain('VRP (Vehicle Routing Problem) JSON Schema')
      expect(systemPrompt).toContain('Core Structure')
      expect(systemPrompt).toContain('Jobs Array')
      expect(systemPrompt).toContain('Resources Array')
      expect(systemPrompt).toContain('Response Format')
      expect(systemPrompt).toContain('modifiedData')
      expect(systemPrompt).toContain('explanation')
      expect(systemPrompt).toContain('changes')
    })

    it('should build user message with current data and request', () => {
      const request: VrpModificationRequest = {
        currentData: sampleData,
        userRequest: 'Add a new delivery job',
        context: 'Customer needs urgent delivery'
      }

      const userMessage = (openAIService as any).buildVrpUserMessage(request)
      
      expect(userMessage).toContain('Current VRP data:')
      expect(userMessage).toContain('User request: Add a new delivery job')
      expect(userMessage).toContain('Additional context: Customer needs urgent delivery')
      expect(userMessage).toContain(JSON.stringify(sampleData, null, 2))
    })

    it('should build user message without context', () => {
      const request: VrpModificationRequest = {
        currentData: sampleData,
        userRequest: 'Add time windows to all jobs'
      }

      const userMessage = (openAIService as any).buildVrpUserMessage(request)
      
      expect(userMessage).toContain('User request: Add time windows to all jobs')
      expect(userMessage).not.toContain('Additional context:')
    })
  })

  describe('parseVrpResponse', () => {
    it('should parse valid AI response', () => {
      const mockResponse = JSON.stringify({
        modifiedData: {
          ...sampleData,
          jobs: [...sampleData.jobs, { name: 'new_job', duration: 600 }]
        },
        explanation: 'Added new delivery job',
        changes: [
          { type: 'add', target: 'job', description: 'Added new_job with 600s duration' }
        ]
      })

      const result = (openAIService as any).parseVrpResponse(mockResponse, sampleData)
      
      expect(result.modifiedData.jobs).toHaveLength(sampleData.jobs.length + 1)
      expect(result.explanation).toBe('Added new delivery job')
      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].type).toBe('add')
    })

    it('should extract JSON from response with extra text', () => {
      const mockResponse = `Here's the modified VRP data:

${JSON.stringify({
  modifiedData: sampleData,
  explanation: 'No changes needed',
  changes: []
})}

This should work well for your optimization.`

      const result = (openAIService as any).parseVrpResponse(mockResponse, sampleData)
      
      expect(result.explanation).toBe('No changes needed')
      expect(result.modifiedData).toEqual(sampleData)
    })

    it('should handle invalid JSON gracefully', () => {
      const mockResponse = 'This is not valid JSON'

      const result = (openAIService as any).parseVrpResponse(mockResponse, sampleData)
      
      expect(result.modifiedData).toEqual(sampleData)
      expect(result.explanation).toContain('Failed to parse AI response')
      expect(result.changes).toHaveLength(0)
    })

    it('should validate modified data structure', () => {
      const mockResponse = JSON.stringify({
        modifiedData: { invalid: 'structure' }, // Missing jobs and resources
        explanation: 'Invalid modification',
        changes: []
      })

      const result = (openAIService as any).parseVrpResponse(mockResponse, sampleData)
      
      expect(result.modifiedData).toEqual(sampleData)
      expect(result.explanation).toContain('Invalid VRP structure')
    })

    it('should handle missing modifiedData field', () => {
      const mockResponse = JSON.stringify({
        explanation: 'Missing data field',
        changes: []
      })

      const result = (openAIService as any).parseVrpResponse(mockResponse, sampleData)
      
      expect(result.modifiedData).toEqual(sampleData)
      expect(result.explanation).toContain('Response missing modifiedData field')
    })
  })

  describe('modifyVrpData', () => {
    it('should make API call and return parsed response', async () => {
      const mockApiResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              modifiedData: {
                ...sampleData,
                jobs: [...sampleData.jobs, { name: 'ai_added_job', duration: 900 }]
              },
              explanation: 'Added new job as requested',
              changes: [{ type: 'add', target: 'job', description: 'Added ai_added_job' }]
            })
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      const request: VrpModificationRequest = {
        currentData: sampleData,
        userRequest: 'Add a new job named ai_added_job'
      }

      const result = await openAIService.modifyVrpData(request)
      
      expect(result.modifiedData.jobs).toHaveLength(sampleData.jobs.length + 1)
      expect(result.explanation).toBe('Added new job as requested')
      expect(result.changes).toHaveLength(1)
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Server Error'
      }
      
      ;(fetch as jest.Mock).mockImplementation(() => Promise.resolve(mockResponse))

      const request: VrpModificationRequest = {
        currentData: sampleData,
        userRequest: 'Add a new job'
      }

      await expect(openAIService.modifyVrpData(request)).rejects.toThrow('OpenAI API error: 500 Server Error')
    })
  })

  describe('generateSuggestions', () => {
    it('should generate contextual suggestions', async () => {
      const mockApiResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              'Add time windows to jobs for better customer service',
              'Consider adding a second vehicle for better distribution',
              'Add capacity constraints to optimize loading',
              'Include priority levels for urgent deliveries'
            ])
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      const suggestions = await openAIService.generateSuggestions(sampleData)
      
      expect(suggestions).toHaveLength(4)
      expect(suggestions[0]).toContain('time windows')
      expect(suggestions[1]).toContain('vehicle')
      expect(suggestions[2]).toContain('capacity')
      expect(suggestions[3]).toContain('priority')
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })

    it('should provide fallback suggestions on API failure', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const suggestions = await openAIService.generateSuggestions(sampleData)
      
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)
      // Should include default suggestions
      expect(suggestions.some(s => s.includes('priorities') || s.includes('breaks'))).toBe(true)
    })

    it('should handle invalid JSON response gracefully', async () => {
      const mockApiResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      const suggestions = await openAIService.generateSuggestions(sampleData)
      
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('generateFallbackSuggestions', () => {
    it('should suggest more vehicles for high job-to-resource ratio', () => {
      const highJobData = {
        ...sampleData,
        jobs: Array(50).fill(null).map((_, i) => ({ name: `job_${i}`, duration: 600 }))
      }

      const suggestions = (openAIService as any).generateFallbackSuggestions(highJobData)
      
      expect(suggestions.some(s => s.includes('Add more vehicles'))).toBe(true)
    })

    it('should suggest time windows for jobs without them', () => {
      const noWindowsData = {
        ...sampleData,
        jobs: sampleData.jobs.map(job => ({ ...job, windows: undefined }))
      }

      const suggestions = (openAIService as any).generateFallbackSuggestions(noWindowsData)
      
      expect(suggestions.some(s => s.includes('time windows'))).toBe(true)
    })

    it('should suggest capacity definitions when missing', () => {
      // Create data with capacity that has at least one resource with defined capacity
      const dataWithCapacity = {
        ...sampleData,
        resources: [
          { ...sampleData.resources[0], capacity: [1000] }, // Has capacity
          { name: 'resource_without_capacity', shifts: [{ from: '2024-01-15T08:00:00Z', to: '2024-01-15T18:00:00Z' }] } // No capacity
        ]
      }

      // Now remove all capacities
      const noCapacityData = {
        ...dataWithCapacity,
        resources: dataWithCapacity.resources.map(res => ({ ...res, capacity: undefined }))
      }

      const suggestions = (openAIService as any).generateFallbackSuggestions(noCapacityData)
      
      expect(suggestions.some(s => s.includes('capacit'))).toBe(true) // Matches both 'capacity' and 'capacities'
    })

    it('should always include priority and breaks suggestions', () => {
      const suggestions = (openAIService as any).generateFallbackSuggestions(sampleData)
      
      expect(suggestions.some(s => s.includes('priorities'))).toBe(true)
      expect(suggestions.some(s => s.includes('breaks'))).toBe(true)
    })
  })

  describe('Token Optimization', () => {
    it('should provide concise but comprehensive schema', () => {
      const schema = VrpSchemaService.getSchemaForAI()
      
      // Should be comprehensive but not overly verbose
      expect(schema.length).toBeGreaterThan(1000) // Has enough detail
      expect(schema.length).toBeLessThan(5000)    // But not too verbose
      
      // Should include examples but be token-efficient
      expect(schema.split('\n').length).toBeLessThan(200) // Reasonable line count
    })

    it('should include essential keywords for AI understanding', () => {
      const schema = VrpSchemaService.getSchemaForAI()
      
      const essentialKeywords = [
        'jobs', 'resources', 'location', 'shifts', 'duration', 'windows',
        'latitude', 'longitude', 'datetime', 'priority', 'capacity', 'tags'
      ]
      
      essentialKeywords.forEach(keyword => {
        expect(schema.toLowerCase()).toContain(keyword.toLowerCase())
      })
    })
  })
})