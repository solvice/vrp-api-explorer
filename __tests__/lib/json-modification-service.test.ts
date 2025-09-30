import { JsonModificationService, ModificationResult, ProcessingOptions } from '../../lib/json-modification-service'
import { OpenAIService, VrpModificationResponse } from '../../lib/openai-service'
import { getSampleVrpData } from '../../lib/sample-data'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

// Mock the OpenAI service
jest.mock('../../lib/openai-service')

describe('JsonModificationService', () => {
  let service: JsonModificationService
  let mockOpenAIService: jest.Mocked<OpenAIService>
  let sampleData: Vrp.VrpSyncSolveParams

  beforeEach(() => {
    // Create mock OpenAI service
    mockOpenAIService = {
      modifyVrpData: jest.fn(),
      generateSuggestions: jest.fn(),
      isConfigured: jest.fn().mockResolvedValue(true),
      getConfigurationStatus: jest.fn().mockReturnValue('Server-side configured'),
    } as any

    service = new JsonModificationService(mockOpenAIService)
    sampleData = getSampleVrpData('simple')
  })

  describe('processModificationRequest', () => {
    it('should successfully process a valid modification request', async () => {
      const modifiedData = {
        ...sampleData,
        jobs: [...sampleData.jobs, { name: 'new_job', duration: 900 }]
      }

      const mockResponse: VrpModificationResponse = {
        modifiedData,
        explanation: 'Added new job successfully',
        changes: [{ type: 'add', target: 'job', description: 'Added new_job' }]
      }

      mockOpenAIService.modifyVrpData.mockResolvedValueOnce(mockResponse)

      const result = await service.processModificationRequest(
        sampleData,
        'Add a new job named new_job'
      )

      expect(result.success).toBe(true)
      expect(result.modifiedData).toEqual(modifiedData)
      expect(result.explanation).toBe('Added new job successfully')
      expect(result.attempts).toBe(1)
      expect(result.changes).toHaveLength(1)
    })

    it('should retry on validation failures and eventually succeed', async () => {
      const invalidData = {
        ...sampleData,
        jobs: [] // Invalid: no jobs
      }

      const validData = {
        ...sampleData,
        jobs: [...sampleData.jobs, { name: 'valid_job', duration: 600 }]
      }

      // First attempt returns invalid data, second attempt returns valid data
      mockOpenAIService.modifyVrpData
        .mockResolvedValueOnce({
          modifiedData: invalidData,
          explanation: 'Invalid attempt',
          changes: []
        })
        .mockResolvedValueOnce({
          modifiedData: validData,
          explanation: 'Valid modification',
          changes: [{ type: 'add', target: 'job', description: 'Added valid_job' }]
        })

      const result = await service.processModificationRequest(
        sampleData,
        'Add a new job'
      )

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(2)
      expect(result.modifiedData).toEqual(validData)
      expect(mockOpenAIService.modifyVrpData).toHaveBeenCalledTimes(2)
    })

    it('should fail after max retries with validation errors', async () => {
      const invalidData = {
        ...sampleData,
        jobs: [] // Always invalid
      }

      mockOpenAIService.modifyVrpData.mockResolvedValue({
        modifiedData: invalidData,
        explanation: 'Invalid modification',
        changes: []
      })

      const result = await service.processModificationRequest(
        sampleData,
        'Remove all jobs',
        { maxRetries: 2 }
      )

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(2)
      expect(result.validationErrors).toBeDefined()
      expect(result.validationErrors![0]).toContain('At least one job is required')
      expect(mockOpenAIService.modifyVrpData).toHaveBeenCalledTimes(2)
    })

    it('should handle OpenAI service errors gracefully', async () => {
      mockOpenAIService.modifyVrpData.mockRejectedValue(new Error('API Error'))

      const result = await service.processModificationRequest(
        sampleData,
        'Add a new job',
        { maxRetries: 2 }
      )

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(2)
      expect(result.explanation).toContain('API Error')
    })

    it('should skip validation when disabled', async () => {
      const invalidData = {
        ...sampleData,
        jobs: [] // Would normally be invalid
      }

      mockOpenAIService.modifyVrpData.mockResolvedValueOnce({
        modifiedData: invalidData,
        explanation: 'Validation disabled',
        changes: []
      })

      const result = await service.processModificationRequest(
        sampleData,
        'Remove all jobs',
        { validateResult: false }
      )

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(1)
      expect(result.modifiedData).toEqual(invalidData)
    })

    it('should validate input data before processing', async () => {
      const invalidInput = {
        jobs: [],
        resources: []
      } as Vrp.VrpSyncSolveParams

      const result = await service.processModificationRequest(
        invalidInput,
        'Add a job'
      )

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(0)
      expect(result.explanation).toContain('Input data is invalid')
      expect(mockOpenAIService.modifyVrpData).not.toHaveBeenCalled()
    })

    it('should include retry context in subsequent attempts', async () => {
      const invalidData = { ...sampleData, jobs: [] }
      const validData = { ...sampleData, jobs: [...sampleData.jobs, { name: 'retry_job', duration: 300 }] }

      mockOpenAIService.modifyVrpData
        .mockResolvedValueOnce({
          modifiedData: invalidData,
          explanation: 'First attempt',
          changes: []
        })
        .mockResolvedValueOnce({
          modifiedData: validData,
          explanation: 'Second attempt',
          changes: []
        })

      await service.processModificationRequest(sampleData, 'Add a job')

      // Check that the second call included retry context
      const secondCallArgs = mockOpenAIService.modifyVrpData.mock.calls[1][0]
      expect(secondCallArgs.context).toContain('This is attempt 2')
      expect(secondCallArgs.context).toContain('Previous attempt failed')
    })
  })

  describe('validateModification', () => {
    it('should validate coordinate ranges', async () => {
      const invalidData = {
        ...sampleData,
        jobs: [{
          name: 'invalid_job',
          location: { latitude: 200, longitude: -300 } // Invalid coordinates
        }]
      }

      mockOpenAIService.modifyVrpData.mockResolvedValueOnce({
        modifiedData: invalidData,
        explanation: 'Invalid coordinates',
        changes: []
      })

      const validationResult = service.validateModification(sampleData, invalidData)
      
      expect(validationResult.success).toBe(false)
      expect(validationResult.errors.some(err => err.includes('Invalid latitude'))).toBe(true)
      expect(validationResult.errors.some(err => err.includes('Invalid longitude'))).toBe(true)
    })

    it('should validate shift date constraints', () => {
      const invalidData = {
        ...sampleData,
        resources: [{
          name: 'invalid_resource',
          shifts: [{
            from: '2024-01-15T18:00:00Z',
            to: '2024-01-15T08:00:00Z' // End before start
          }]
        }]
      }

      const validationResult = service.validateModification(sampleData, invalidData)
      
      expect(validationResult.success).toBe(false)
      expect(validationResult.errors.some(err => err.includes('must be before'))).toBe(true)
    })

    it('should validate job duration constraints', () => {
      const invalidData = {
        ...sampleData,
        jobs: [{
          name: 'invalid_duration_job',
          duration: -100 // Negative duration
        }]
      }

      const validationResult = service.validateModification(sampleData, invalidData)
      
      expect(validationResult.success).toBe(false)
      expect(validationResult.errors.some(err => err.includes('Invalid duration'))).toBe(true)
    })

    it('should prevent excessive job additions', () => {
      const excessiveData = {
        ...sampleData,
        jobs: Array(sampleData.jobs.length * 5).fill(null).map((_, i) => ({
          name: `excess_job_${i}`,
          duration: 600
        }))
      }

      const validationResult = service.validateModification(sampleData, excessiveData)
      
      expect(validationResult.success).toBe(false)
      expect(validationResult.errors.some(err => err.includes('too many jobs'))).toBe(true)
    })
  })

  describe('generateOptimizationSuggestions', () => {
    it('should return AI-generated suggestions when available', async () => {
      const mockSuggestions = [
        'Add time windows for better scheduling',
        'Consider increasing vehicle capacity',
        'Add priority levels to urgent jobs'
      ]

      mockOpenAIService.generateSuggestions.mockResolvedValueOnce(mockSuggestions)

      const suggestions = await service.generateOptimizationSuggestions(sampleData)

      expect(suggestions).toEqual(mockSuggestions)
      expect(mockOpenAIService.generateSuggestions).toHaveBeenCalledWith(sampleData)
    })

    it('should return fallback suggestions when AI fails', async () => {
      mockOpenAIService.generateSuggestions.mockRejectedValueOnce(new Error('AI Error'))

      const suggestions = await service.generateOptimizationSuggestions(sampleData)

      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)
      // Should include default suggestions
      expect(suggestions.some(s => s.includes('time windows') || s.includes('priority'))).toBe(true)
    })

    it('should generate specific suggestions based on data characteristics', async () => {
      // Create data with many jobs but few resources
      const highJobData = {
        ...sampleData,
        jobs: Array(50).fill(null).map((_, i) => ({ name: `job_${i}`, duration: 600 }))
      }

      mockOpenAIService.generateSuggestions.mockRejectedValueOnce(new Error('Use fallback'))

      const suggestions = await service.generateOptimizationSuggestions(highJobData)

      expect(suggestions.some(s => s.includes('adding more vehicles'))).toBe(true)
    })

    it('should suggest capacity optimization when none defined', async () => {
      const noCapacityData = {
        ...sampleData,
        resources: sampleData.resources.map(res => ({ ...res, capacity: undefined }))
      }

      mockOpenAIService.generateSuggestions.mockRejectedValueOnce(new Error('Use fallback'))

      const suggestions = await service.generateOptimizationSuggestions(noCapacityData)

      expect(suggestions.some(s => s.includes('capacities'))).toBe(true)
    })
  })

  describe('buildRequestContext', () => {
    it('should include basic statistics in context', async () => {
      mockOpenAIService.modifyVrpData.mockResolvedValueOnce({
        modifiedData: sampleData,
        explanation: 'Test',
        changes: []
      })

      await service.processModificationRequest(sampleData, 'Test request')

      const callArgs = mockOpenAIService.modifyVrpData.mock.calls[0][0]
      expect(callArgs.context).toContain(`${sampleData.jobs.length} jobs`)
      expect(callArgs.context).toContain(`${sampleData.resources.length} resources`)
    })

    it('should add guidance for large instances', async () => {
      const largeData = {
        ...sampleData,
        jobs: Array(100).fill(null).map((_, i) => ({ name: `job_${i}`, duration: 600 }))
      }

      mockOpenAIService.modifyVrpData.mockResolvedValueOnce({
        modifiedData: largeData,
        explanation: 'Test',
        changes: []
      })

      await service.processModificationRequest(largeData, 'Test large instance')

      const callArgs = mockOpenAIService.modifyVrpData.mock.calls[0][0]
      expect(callArgs.context).toContain('large VRP instance')
      expect(callArgs.context).toContain('Be conservative')
    })

    it('should mention time windows when present', async () => {
      const windowData = {
        ...sampleData,
        jobs: [{
          name: 'windowed_job',
          duration: 600,
          windows: [{ from: '2024-01-15T09:00:00Z', to: '2024-01-15T17:00:00Z' }]
        }]
      }

      mockOpenAIService.modifyVrpData.mockResolvedValueOnce({
        modifiedData: windowData,
        explanation: 'Test',
        changes: []
      })

      await service.processModificationRequest(windowData, 'Test with windows')

      const callArgs = mockOpenAIService.modifyVrpData.mock.calls[0][0]
      expect(callArgs.context).toContain('time windows')
    })
  })

  describe('service configuration', () => {
    it('should report correct configuration status', async () => {
      expect(await service.isConfigured()).toBe(true)

      const status = await service.getStatus()
      expect(status.configured).toBe(true)
      expect(status.apiKey).toBe('Server-side configured')
    })

    it('should handle unconfigured OpenAI service', async () => {
      mockOpenAIService.isConfigured.mockResolvedValue(false)
      mockOpenAIService.getConfigurationStatus.mockReturnValue('Not configured')

      expect(await service.isConfigured()).toBe(false)

      const status = await service.getStatus()
      expect(status.configured).toBe(false)
      expect(status.apiKey).toBe('Not configured')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle malformed JSON in AI responses gracefully', async () => {
      // This would be handled by the OpenAI service, but test the pipeline
      mockOpenAIService.modifyVrpData.mockResolvedValueOnce({
        modifiedData: sampleData, // Fallback to original
        explanation: 'Failed to parse AI response',
        changes: []
      })

      const result = await service.processModificationRequest(
        sampleData,
        'Test malformed response'
      )

      expect(result.success).toBe(true) // Service should handle gracefully
      expect(result.modifiedData).toEqual(sampleData)
    })

    it('should handle empty user requests', async () => {
      mockOpenAIService.modifyVrpData.mockResolvedValueOnce({
        modifiedData: sampleData,
        explanation: 'No changes requested',
        changes: []
      })

      const result = await service.processModificationRequest(sampleData, '')

      expect(result.success).toBe(true)
      expect(mockOpenAIService.modifyVrpData).toHaveBeenCalledWith(
        expect.objectContaining({ userRequest: '' })
      )
    })

    it('should handle very long user requests', async () => {
      const longRequest = 'Add a new job '.repeat(1000) // Very long request

      mockOpenAIService.modifyVrpData.mockResolvedValueOnce({
        modifiedData: sampleData,
        explanation: 'Processed long request',
        changes: []
      })

      const result = await service.processModificationRequest(sampleData, longRequest)

      expect(result.success).toBe(true)
      expect(mockOpenAIService.modifyVrpData).toHaveBeenCalledWith(
        expect.objectContaining({ userRequest: longRequest })
      )
    })
  })
})