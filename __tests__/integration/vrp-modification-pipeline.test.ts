import { JsonModificationService } from '../../lib/json-modification-service'
import { OpenAIService } from '../../components/VrpAssistant/OpenAIService'
import { getSampleVrpData } from '../../lib/sample-data'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

// Mock fetch for OpenAI API calls
global.fetch = jest.fn()

describe('VRP Modification Pipeline Integration', () => {
  let service: JsonModificationService
  let sampleData: Vrp.VrpSyncSolveParams

  beforeEach(() => {
    // Set up test environment
    process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'test-api-key-for-integration'
    
    const openAIService = new OpenAIService()
    service = new JsonModificationService(openAIService)
    sampleData = getSampleVrpData('simple')
    
    jest.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_OPENAI_API_KEY
  })

  describe('End-to-End Modification Flow', () => {
    it('should complete full pipeline for adding a new job', async () => {
      // Mock successful OpenAI response
      const mockApiResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              modifiedData: {
                ...sampleData,
                jobs: [
                  ...sampleData.jobs,
                  {
                    name: 'delivery_new_location',
                    duration: 900,
                    location: { latitude: 51.0600, longitude: 3.7350 },
                    windows: [{ from: '2024-01-15T10:00:00Z', to: '2024-01-15T16:00:00Z' }]
                  }
                ]
              },
              explanation: 'Added new delivery job with time window',
              changes: [{
                type: 'add',
                target: 'job',
                description: 'Added delivery_new_location with 15-minute duration and 6-hour time window'
              }]
            })
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      const result = await service.processModificationRequest(
        sampleData,
        'Add a new delivery job at latitude 51.06, longitude 3.735 with a time window from 10 AM to 4 PM'
      )

      expect(result.success).toBe(true)
      expect(result.modifiedData?.jobs).toHaveLength(sampleData.jobs.length + 1)
      expect(result.modifiedData?.jobs[sampleData.jobs.length].name).toBe('delivery_new_location')
      expect(result.attempts).toBe(1)
      expect(result.changes).toHaveLength(1)
      expect(result.explanation).toContain('Added new delivery job')
    })

    it('should handle retry scenario with initial validation failure', async () => {
      // First response has invalid data (coordinates out of bounds)
      const firstMockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              modifiedData: {
                ...sampleData,
                jobs: [{
                  name: 'invalid_coordinates_job',
                  duration: 600,
                  location: { latitude: 200, longitude: -300 } // Invalid coordinates
                }]
              },
              explanation: 'First attempt with invalid coordinates',
              changes: []
            })
          }
        }]
      }

      // Second response has valid data
      const secondMockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              modifiedData: {
                ...sampleData,
                jobs: [
                  ...sampleData.jobs,
                  {
                    name: 'corrected_job',
                    duration: 600,
                    location: { latitude: 51.0500, longitude: 3.7200 }
                  }
                ]
              },
              explanation: 'Corrected job with proper structure',
              changes: [{
                type: 'add',
                target: 'job',
                description: 'Added properly structured job'
              }]
            })
          }
        }]
      }

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(firstMockResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(secondMockResponse)
        })

      const result = await service.processModificationRequest(
        sampleData,
        'Add a new job',
        { maxRetries: 2 }
      )

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(2)
      expect(result.modifiedData?.jobs).toHaveLength(sampleData.jobs.length + 1)
      expect(result.modifiedData?.jobs[sampleData.jobs.length].name).toBe('corrected_job')
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should fail gracefully after max retries', async () => {
      // Always return invalid data (coordinates out of bounds)
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              modifiedData: {
                ...sampleData,
                jobs: [{
                  name: 'always_invalid_job',
                  duration: 600,
                  location: { latitude: 1000, longitude: -1000 } // Always invalid coordinates
                }]
              },
              explanation: 'Invalid modification',
              changes: []
            })
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await service.processModificationRequest(
        sampleData,
        'Remove all jobs',
        { maxRetries: 2 }
      )

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(2)
      expect(result.validationErrors).toBeDefined()
      expect(result.validationErrors!.some(err => err.includes('Invalid latitude'))).toBe(true)
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should handle OpenAI API errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await service.processModificationRequest(
        sampleData,
        'Add a new job',
        { maxRetries: 2 }
      )

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(2)
      expect(result.explanation).toContain('Network error')
    })

    it('should handle complex multi-resource modification', async () => {
      const mockApiResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              modifiedData: {
                ...sampleData,
                jobs: [
                  ...sampleData.jobs,
                  {
                    name: 'priority_delivery',
                    duration: 1200,
                    priority: 5,
                    urgency: 3,
                    location: { latitude: 51.0450, longitude: 3.7100 },
                    tags: [{ name: 'urgent', hard: true }]
                  }
                ],
                resources: [
                  ...sampleData.resources,
                  {
                    name: 'express_vehicle',
                    shifts: [{
                      from: '2024-01-15T06:00:00Z',
                      to: '2024-01-15T22:00:00Z',
                      start: { latitude: 50.99, longitude: 3.81 },
                      end: { latitude: 50.99, longitude: 3.81 }
                    }],
                    capacity: [2000, 1000],
                    category: 'TRUCK' as const,
                    tags: ['urgent', 'express']
                  }
                ]
              },
              explanation: 'Added priority job and express vehicle for urgent deliveries',
              changes: [
                { type: 'add', target: 'job', description: 'Added priority_delivery with urgent tag' },
                { type: 'add', target: 'resource', description: 'Added express_vehicle with extended hours' }
              ]
            })
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      const result = await service.processModificationRequest(
        sampleData,
        'Add a high-priority urgent delivery job and create an express vehicle to handle it'
      )

      expect(result.success).toBe(true)
      expect(result.modifiedData?.jobs).toHaveLength(sampleData.jobs.length + 1)
      expect(result.modifiedData?.resources).toHaveLength(sampleData.resources.length + 1)
      expect(result.changes).toHaveLength(2)
      
      // Verify job properties
      const newJob = result.modifiedData?.jobs[sampleData.jobs.length]
      expect(newJob?.name).toBe('priority_delivery')
      expect(newJob?.priority).toBe(5)
      expect(newJob?.tags?.[0].name).toBe('urgent')
      
      // Verify resource properties
      const newResource = result.modifiedData?.resources[sampleData.resources.length]
      expect(newResource?.name).toBe('express_vehicle')
      expect(newResource?.category).toBe('TRUCK')
      expect(newResource?.tags).toContain('urgent')
    })
  })

  describe('Suggestion Generation Pipeline', () => {
    it('should generate contextual suggestions', async () => {
      const mockApiResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              'Add time windows to improve delivery scheduling',
              'Consider increasing vehicle capacity for better load optimization',
              'Implement priority levels for urgent deliveries',
              'Add skill tags to match jobs with qualified drivers'
            ])
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      const suggestions = await service.generateOptimizationSuggestions(sampleData)

      expect(suggestions).toHaveLength(4)
      expect(suggestions[0]).toContain('time windows')
      expect(suggestions[1]).toContain('capacity')
      expect(suggestions[2]).toContain('priority')
      expect(suggestions[3]).toContain('skill tags')
    })

    it('should provide fallback suggestions when AI fails', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      const suggestions = await service.generateOptimizationSuggestions(sampleData)

      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('Validation Edge Cases', () => {
    it('should detect and prevent coordinate out-of-bounds', async () => {
      const mockApiResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              modifiedData: {
                ...sampleData,
                jobs: [{
                  name: 'invalid_location_job',
                  duration: 600,
                  location: { latitude: 200, longitude: -300 } // Invalid coordinates
                }]
              },
              explanation: 'Added job with invalid coordinates',
              changes: []
            })
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      const result = await service.processModificationRequest(
        sampleData,
        'Add a job with invalid coordinates',
        { maxRetries: 1 }
      )

      expect(result.success).toBe(false)
      expect(result.validationErrors?.some(err => err.includes('Invalid latitude'))).toBe(true)
      expect(result.validationErrors?.some(err => err.includes('Invalid longitude'))).toBe(true)
    })

    it('should validate datetime formats in shifts', async () => {
      const mockApiResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              modifiedData: {
                ...sampleData,
                resources: [{
                  name: 'invalid_shift_resource',
                  shifts: [{
                    from: 'invalid-date',
                    to: '2024-01-15T18:00:00Z'
                  }]
                }]
              },
              explanation: 'Added resource with invalid shift',
              changes: []
            })
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      const result = await service.processModificationRequest(
        sampleData,
        'Add resource with invalid shift times',
        { maxRetries: 1 }
      )

      expect(result.success).toBe(false)
      expect(result.validationErrors?.some(err => err.includes('Invalid'))).toBe(true)
    })

    it('should prevent excessive resource addition', async () => {
      const mockApiResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              modifiedData: {
                ...sampleData,
                resources: [
                  ...sampleData.resources,
                  ...Array(10).fill(null).map((_, i) => ({
                    name: `excess_vehicle_${i}`,
                    shifts: [{
                      from: '2024-01-15T08:00:00Z',
                      to: '2024-01-15T18:00:00Z'
                    }]
                  }))
                ]
              },
              explanation: 'Added too many resources',
              changes: []
            })
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      const result = await service.processModificationRequest(
        sampleData,
        'Add many vehicles',
        { maxRetries: 1 }
      )

      expect(result.success).toBe(false)
      expect(result.validationErrors?.some(err => err.includes('too many resources'))).toBe(true)
    })
  })

  describe('Context Building', () => {
    it('should build appropriate context for retry attempts', async () => {
      // First attempt returns invalid data (coordinates out of bounds)
      const firstMockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              modifiedData: {
                ...sampleData,
                jobs: [{
                  name: 'invalid_job',
                  duration: 600,
                  location: { latitude: 500, longitude: -500 } // Invalid coordinates
                }]
              },
              explanation: 'Invalid first attempt',
              changes: []
            })
          }
        }]
      }

      // Second attempt should receive context about the failure
      const secondMockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              modifiedData: {
                ...sampleData,
                jobs: [...sampleData.jobs, { name: 'retry_job', duration: 600 }]
              },
              explanation: 'Successful retry',
              changes: []
            })
          }
        }]
      }

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(firstMockResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(secondMockResponse)
        })

      const result = await service.processModificationRequest(
        sampleData,
        'Add a job',
        { maxRetries: 2 }
      )

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(2)

      // Verify the second request included retry context
      const secondCallBody = JSON.parse((fetch as jest.Mock).mock.calls[1][1].body)
      const secondUserMessage = secondCallBody.messages.find((m: any) => m.role === 'user')
      expect(secondUserMessage.content).toContain('This is attempt 2')
      expect(secondUserMessage.content).toContain('Previous attempt failed')
    })
  })

  describe('Service Configuration', () => {
    it('should report service status correctly', () => {
      const status = service.getStatus()
      
      expect(status.configured).toBe(true)
      expect(status.apiKey).toContain('test-ap') // Masked version
    })

    it('should handle missing API key', () => {
      delete process.env.NEXT_PUBLIC_OPENAI_API_KEY
      
      expect(() => new OpenAIService()).toThrow('OpenAI API key is required')
    })
  })
})