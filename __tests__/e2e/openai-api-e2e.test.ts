/**
 * End-to-End Tests for OpenAI API Integration
 * 
 * These tests use REAL OpenAI API calls to verify the OpenAI service works.
 * They test the actual API integration without UI components.
 * 
 * Required Environment Variables:
 * - NEXT_PUBLIC_OPENAI_API_KEY: Valid OpenAI API key for testing
 * - E2E_TEST_ENABLED: Set to 'true' to run these tests (optional guard)
 */

import { OpenAIService, VrpModificationRequest } from '../../components/VrpAssistant/OpenAIService'
import { getSampleVrpData } from '../../lib/sample-data'
import { validateVrpRequest } from '../../lib/vrp-schema'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

// Provide a real fetch implementation for Node.js
if (typeof global.fetch === 'undefined') {
  const fetch = require('node-fetch');
  const { Headers, Request, Response } = fetch;
  global.fetch = fetch;
  global.Headers = Headers;
  global.Request = Request;
  global.Response = Response;
}

// Test configuration
const TEST_TIMEOUT = 30000 // 30 seconds for OpenAI API calls
const SKIP_IF_NO_API_KEY = !process.env.OPENAI_API_KEY
const SKIP_IF_E2E_DISABLED = process.env.E2E_TEST_ENABLED !== 'true'

// Skip tests if API key is not available or E2E tests are disabled
const describeE2E = (SKIP_IF_NO_API_KEY || SKIP_IF_E2E_DISABLED) ? describe.skip : describe

describe('OpenAI API E2E Tests', () => {
  if (SKIP_IF_NO_API_KEY) {
    it('Skipped: No OpenAI API key provided', () => {
      console.warn('OpenAI E2E tests skipped - set OPENAI_API_KEY to run these tests')
    })
    return
  }

  if (SKIP_IF_E2E_DISABLED) {
    it('Skipped: E2E tests disabled', () => {
      console.warn('OpenAI E2E tests skipped - set E2E_TEST_ENABLED=true to run these tests')
    })
    return
  }

  describeE2E('Real OpenAI Service Tests', () => {
    let openAIService: OpenAIService
    let sampleData: Vrp.VrpSyncSolveParams

    beforeEach(() => {
      openAIService = new OpenAIService()
      sampleData = getSampleVrpData('simple')
    })

    it('should successfully modify VRP data by adding a new job', async () => {
      const request: VrpModificationRequest = {
        currentData: sampleData,
        userRequest: 'Add a new delivery job with name "test_delivery" and duration 900 seconds'
      }

      console.log('Making real OpenAI API call to add new job...')
      const result = await openAIService.modifyVrpData(request)

      // Verify response structure
      expect(result).toBeDefined()
      expect(result.modifiedData).toBeDefined()
      expect(result.explanation).toBeDefined()
      expect(typeof result.explanation).toBe('string')
      expect(result.explanation.length).toBeGreaterThan(0)

      // Verify job was added
      expect(result.modifiedData.jobs.length).toBeGreaterThan(sampleData.jobs.length)
      
      // Look for the new job
      const newJob = result.modifiedData.jobs.find(job => 
        job.name === 'test_delivery' || 
        job.name?.includes('test') ||
        job.duration === 900
      )
      expect(newJob).toBeDefined()

      // Verify the modified data is still valid VRP data
      const validation = validateVrpRequest(result.modifiedData)
      if (!validation.valid) {
        console.error('Validation errors:', validation.errors)
        console.error('Modified data:', JSON.stringify(result.modifiedData, null, 2))
      }
      expect(validation.valid).toBe(true)

      console.log('✅ Successfully added new job via OpenAI')
      console.log('Explanation:', result.explanation)
      
    }, TEST_TIMEOUT)

    it('should successfully modify VRP data by adding time windows', async () => {
      const request: VrpModificationRequest = {
        currentData: sampleData,
        userRequest: 'Add time windows from 9:00 AM to 5:00 PM on January 15, 2024 to all jobs'
      }

      console.log('Making real OpenAI API call to add time windows...')
      const result = await openAIService.modifyVrpData(request)

      // Verify response structure
      expect(result).toBeDefined()
      expect(result.modifiedData).toBeDefined()
      expect(result.explanation).toBeDefined()

      // Verify time windows were added
      const jobsWithWindows = result.modifiedData.jobs.filter(job => 
        job.windows && job.windows.length > 0
      )
      expect(jobsWithWindows.length).toBeGreaterThan(0)

      // Verify window format is reasonable
      if (jobsWithWindows.length > 0) {
        const window = jobsWithWindows[0].windows![0]
        expect(window.from).toBeDefined()
        expect(window.to).toBeDefined()
        expect(window.from).toContain('2024-01-15')
        expect(window.to).toContain('2024-01-15')
      }

      // Verify the modified data is still valid
      const validation = validateVrpRequest(result.modifiedData)
      expect(validation.valid).toBe(true)

      console.log('✅ Successfully added time windows via OpenAI')
      console.log('Explanation:', result.explanation)
      
    }, TEST_TIMEOUT)

    it('should successfully add new vehicles/resources', async () => {
      const request: VrpModificationRequest = {
        currentData: sampleData,
        userRequest: 'Add a new truck called "truck_express" with capacity 1500 and working hours 8 AM to 6 PM'
      }

      console.log('Making real OpenAI API call to add new vehicle...')
      const result = await openAIService.modifyVrpData(request)

      // Verify response structure
      expect(result).toBeDefined()
      expect(result.modifiedData).toBeDefined()
      
      // Verify vehicle was added
      expect(result.modifiedData.resources.length).toBeGreaterThan(sampleData.resources.length)
      
      // Look for the new vehicle
      const newVehicle = result.modifiedData.resources.find(resource => 
        resource.name === 'truck_express' ||
        resource.name?.includes('express') ||
        (resource.capacity && resource.capacity.includes(1500))
      )
      expect(newVehicle).toBeDefined()

      if (newVehicle) {
        expect(newVehicle.shifts).toBeDefined()
        expect(newVehicle.shifts.length).toBeGreaterThan(0)
      }

      // Verify the modified data is still valid
      const validation = validateVrpRequest(result.modifiedData)
      expect(validation.valid).toBe(true)

      console.log('✅ Successfully added new vehicle via OpenAI')
      console.log('Explanation:', result.explanation)
      
    }, TEST_TIMEOUT)

    it('should handle reasonable impossible requests gracefully', async () => {
      const request: VrpModificationRequest = {
        currentData: sampleData,
        userRequest: 'Make all vehicles teleport instantly and ignore all time constraints'
      }

      console.log('Making real OpenAI API call with impossible request...')
      const result = await openAIService.modifyVrpData(request)

      // Should still return a valid response structure
      expect(result).toBeDefined()
      expect(result.modifiedData).toBeDefined()
      expect(result.explanation).toBeDefined()

      // Should explain why it can't fulfill the request
      const explanation = result.explanation.toLowerCase()
      expect(
        explanation.includes('cannot') || 
        explanation.includes('not possible') ||
        explanation.includes('realistic') ||
        explanation.includes('unable') ||
        explanation.includes('practical')
      ).toBe(true)

      // The data should still be valid (either unchanged or reasonably modified)
      const validation = validateVrpRequest(result.modifiedData)
      expect(validation.valid).toBe(true)

      console.log('✅ Handled impossible request gracefully')
      console.log('Explanation:', result.explanation)
      
    }, TEST_TIMEOUT)

    it('should work with complex VRP data', async () => {
      const complexData = getSampleVrpData('complex')
      
      const request: VrpModificationRequest = {
        currentData: complexData,
        userRequest: 'Add 2 new delivery jobs with different priorities and add 1 new vehicle to handle the extra load'
      }

      console.log('Making real OpenAI API call with complex data...')
      const result = await openAIService.modifyVrpData(request)

      // Verify response structure
      expect(result).toBeDefined()
      expect(result.modifiedData).toBeDefined()
      
      // Should have added jobs and vehicles
      expect(result.modifiedData.jobs.length).toBeGreaterThan(complexData.jobs.length)
      expect(result.modifiedData.resources.length).toBeGreaterThan(complexData.resources.length)

      // All modified data must pass validation
      const validation = validateVrpRequest(result.modifiedData)
      if (!validation.valid) {
        console.error('Validation errors:', validation.errors)
        console.error('Modified data keys:', Object.keys(result.modifiedData))
      }
      expect(validation.valid).toBe(true)

      console.log('✅ Successfully handled complex VRP data')
      console.log('Explanation:', result.explanation)
      
    }, TEST_TIMEOUT)

    it('should generate helpful suggestions', async () => {
      console.log('Making real OpenAI API call for suggestions...')
      const suggestions = await openAIService.generateSuggestions(sampleData)

      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)
      
      // Suggestions should be meaningful strings
      suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string')
        expect(suggestion.length).toBeGreaterThan(10) // Not just empty or very short
      })

      console.log('✅ Generated helpful suggestions')
      console.log('Suggestions:', suggestions)
      
    }, TEST_TIMEOUT)

    it('should handle API errors gracefully when using invalid API key', async () => {
      // Create service with invalid key
      const invalidService = new OpenAIService('sk-invalid-key-for-testing')
      
      const request: VrpModificationRequest = {
        currentData: sampleData,
        userRequest: 'Add a new job'
      }

      console.log('Testing error handling with invalid API key...')
      
      await expect(invalidService.modifyVrpData(request))
        .rejects.toThrow(/OpenAI API error|Unauthorized|Invalid/)

      console.log('✅ Properly handled invalid API key error')
      
    }, TEST_TIMEOUT)

    it('should maintain data integrity across multiple modifications', async () => {
      let currentData = { ...sampleData }

      // First modification: add a job
      const request1: VrpModificationRequest = {
        currentData,
        userRequest: 'Add a job called "step1_job" with duration 600'
      }

      console.log('Step 1: Adding job...')
      const result1 = await openAIService.modifyVrpData(request1)
      expect(validateVrpRequest(result1.modifiedData).valid).toBe(true)
      currentData = result1.modifiedData

      // Second modification: add a vehicle
      const request2: VrpModificationRequest = {
        currentData,
        userRequest: 'Add a vehicle called "step2_vehicle" with capacity 1000'
      }

      console.log('Step 2: Adding vehicle...')
      const result2 = await openAIService.modifyVrpData(request2)
      expect(validateVrpRequest(result2.modifiedData).valid).toBe(true)
      currentData = result2.modifiedData

      // Third modification: add time windows
      const request3: VrpModificationRequest = {
        currentData,
        userRequest: 'Add time windows to all jobs from 10:00 to 16:00'
      }

      console.log('Step 3: Adding time windows...')
      const result3 = await openAIService.modifyVrpData(request3)
      expect(validateVrpRequest(result3.modifiedData).valid).toBe(true)

      // Final validation: should have all modifications
      const finalData = result3.modifiedData
      expect(finalData.jobs.length).toBeGreaterThan(sampleData.jobs.length)
      expect(finalData.resources.length).toBeGreaterThan(sampleData.resources.length)
      
      // Should find evidence of our modifications
      const hasStep1Job = finalData.jobs.some(job => 
        job.name?.includes('step1') || job.duration === 600
      )
      const hasStep2Vehicle = finalData.resources.some(resource => 
        resource.name?.includes('step2') || 
        (resource.capacity && resource.capacity.includes(1000))
      )
      const hasTimeWindows = finalData.jobs.some(job => 
        job.windows && job.windows.length > 0
      )

      expect(hasStep1Job).toBe(true)
      expect(hasStep2Vehicle).toBe(true)
      expect(hasTimeWindows).toBe(true)

      console.log('✅ Successfully maintained data integrity across multiple modifications')
      
    }, TEST_TIMEOUT * 3) // Triple timeout for multiple API calls
  })

  // Performance and reliability tests
  describeE2E('Performance and Reliability', () => {
    let openAIService: OpenAIService

    beforeEach(() => {
      openAIService = new OpenAIService()
    })

    it('should complete requests within reasonable time', async () => {
      const startTime = Date.now()
      
      const request: VrpModificationRequest = {
        currentData: getSampleVrpData('simple'),
        userRequest: 'Add a delivery job with priority 5'
      }

      await openAIService.modifyVrpData(request)
      
      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within 20 seconds for simple requests
      expect(duration).toBeLessThan(20000)

      console.log(`✅ Request completed in ${duration}ms`)
      
    }, TEST_TIMEOUT)

    it('should handle concurrent requests if needed', async () => {
      const sampleData = getSampleVrpData('simple')
      
      const request1: VrpModificationRequest = {
        currentData: sampleData,
        userRequest: 'Add job "concurrent_1"'
      }
      
      const request2: VrpModificationRequest = {
        currentData: sampleData,
        userRequest: 'Add job "concurrent_2"'
      }

      // Test that multiple requests don't break the service
      const [result1, result2] = await Promise.all([
        openAIService.modifyVrpData(request1),
        openAIService.modifyVrpData(request2)
      ])

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(validateVrpRequest(result1.modifiedData).valid).toBe(true)
      expect(validateVrpRequest(result2.modifiedData).valid).toBe(true)

      console.log('✅ Handled concurrent requests successfully')
      
    }, TEST_TIMEOUT)
  })
})