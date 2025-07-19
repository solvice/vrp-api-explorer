/**
 * End-to-End Tests for OpenAI Chat Functionality
 * 
 * These tests use REAL OpenAI API calls to verify the complete chat workflow.
 * They test the actual user experience from input to VRP data modification.
 * 
 * Required Environment Variables:
 * - NEXT_PUBLIC_OPENAI_API_KEY: Valid OpenAI API key for testing
 * - E2E_TEST_ENABLED: Set to 'true' to run these tests (optional guard)
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VrpJsonEditor } from '@/components/VrpJsonEditor'
import { getSampleVrpData } from '@/lib/sample-data'
import { validateVrpRequest } from '@/lib/vrp-schema'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

// Test configuration
const TEST_TIMEOUT = 30000 // 30 seconds for OpenAI API calls
const SKIP_IF_NO_API_KEY = !process.env.NEXT_PUBLIC_OPENAI_API_KEY
const SKIP_IF_E2E_DISABLED = process.env.E2E_TEST_ENABLED !== 'true'

// Skip tests if API key is not available or E2E tests are disabled
const describeE2E = (SKIP_IF_NO_API_KEY || SKIP_IF_E2E_DISABLED) ? describe.skip : describe

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn()

describe('OpenAI Chat E2E Tests', () => {
  if (SKIP_IF_NO_API_KEY) {
    it('Skipped: No OpenAI API key provided', () => {
      console.warn('OpenAI E2E tests skipped - set NEXT_PUBLIC_OPENAI_API_KEY to run these tests')
    })
    return
  }

  if (SKIP_IF_E2E_DISABLED) {
    it('Skipped: E2E tests disabled', () => {
      console.warn('OpenAI E2E tests skipped - set E2E_TEST_ENABLED=true to run these tests')
    })
    return
  }

  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
    
    // Ensure we have a clean environment
    delete (global as any).fetch
  })

  describeE2E('Real OpenAI Integration', () => {
    let originalData: Vrp.VrpSyncSolveParams
    let onChangeMock: jest.Mock
    let onValidationChangeMock: jest.Mock

    beforeEach(() => {
      originalData = getSampleVrpData('simple')
      onChangeMock = jest.fn()
      onValidationChangeMock = jest.fn()
    })

    const renderVrpJsonEditor = () => {
      return render(
        <VrpJsonEditor
          requestData={originalData}
          onChange={onChangeMock}
          onValidationChange={onValidationChangeMock}
          apiKeyStatus={{ type: 'user', masked: 'sk-test...key' }}
        />
      )
    }

    it('should complete full chat workflow: input → send → OpenAI response → VRP update', async () => {
      const user = userEvent.setup()
      renderVrpJsonEditor()

      // 1. Open the VRP Assistant
      const assistantButton = screen.getByTestId('vrp-assistant-button')
      await user.click(assistantButton)

      // Wait for chat interface to load
      await waitFor(() => {
        expect(screen.getByTestId('chat-input')).toBeInTheDocument()
      })

      // 2. Type a message to modify VRP data
      const chatInput = screen.getByTestId('chat-input')
      const testMessage = 'Add a new delivery job with name "urgent_delivery" and duration 1200 seconds'
      
      await user.type(chatInput, testMessage)
      expect(chatInput).toHaveValue(testMessage)

      // 3. Send the message
      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      // 4. Verify user message appears
      expect(screen.getByText(testMessage)).toBeInTheDocument()

      // 5. Wait for OpenAI processing and response
      await waitFor(() => {
        expect(screen.getByTestId('processing-indicator')).toBeInTheDocument()
      }, { timeout: 5000 })

      // 6. Wait for OpenAI response and VRP data update
      await waitFor(() => {
        // Should show assistant response
        const assistantMessages = screen.getAllByTestId('chat-message')
          .filter(msg => msg.getAttribute('data-type') === 'assistant')
        expect(assistantMessages.length).toBeGreaterThan(0)

        // Should no longer be processing
        expect(screen.queryByTestId('processing-indicator')).not.toBeInTheDocument()
      }, { timeout: TEST_TIMEOUT })

      // 7. Verify VRP data was modified
      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalled()
        const modifiedData = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0]
        
        // Should have more jobs than original
        expect(modifiedData.jobs.length).toBeGreaterThan(originalData.jobs.length)
        
        // Should contain the new job
        const newJob = modifiedData.jobs.find((job: any) => 
          job.name === 'urgent_delivery' || 
          job.name?.includes('urgent') ||
          job.duration === 1200
        )
        expect(newJob).toBeDefined()
        
        // Modified data should still be valid
        const validation = validateVrpRequest(modifiedData)
        expect(validation.valid).toBe(true)
      }, { timeout: 5000 })

    }, TEST_TIMEOUT)

    it('should handle VRP modification requests with time windows', async () => {
      const user = userEvent.setup()
      renderVrpJsonEditor()

      // Open assistant and send message
      const assistantButton = screen.getByTestId('vrp-assistant-button')
      await user.click(assistantButton)

      await waitFor(() => {
        expect(screen.getByTestId('chat-input')).toBeInTheDocument()
      })

      const chatInput = screen.getByTestId('chat-input')
      const timeWindowMessage = 'Add time windows from 09:00 to 17:00 on 2024-01-15 to all jobs'
      
      await user.type(chatInput, timeWindowMessage)
      
      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      // Wait for response and data update
      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalled()
        const modifiedData = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0]
        
        // Should have added time windows to jobs
        const jobsWithWindows = modifiedData.jobs.filter((job: any) => 
          job.windows && job.windows.length > 0
        )
        expect(jobsWithWindows.length).toBeGreaterThan(0)
        
        // Check that time windows are reasonable
        if (jobsWithWindows.length > 0) {
          const window = jobsWithWindows[0].windows[0]
          expect(window.from).toContain('2024-01-15')
          expect(window.to).toContain('2024-01-15')
        }
      }, { timeout: TEST_TIMEOUT })

    }, TEST_TIMEOUT)

    it('should handle requests to add new vehicles/resources', async () => {
      const user = userEvent.setup()
      renderVrpJsonEditor()

      // Open assistant
      const assistantButton = screen.getByTestId('vrp-assistant-button')
      await user.click(assistantButton)

      await waitFor(() => {
        expect(screen.getByTestId('chat-input')).toBeInTheDocument()
      })

      const chatInput = screen.getByTestId('chat-input')
      const vehicleMessage = 'Add a new vehicle called "truck_3" with capacity 2000 and operating hours from 08:00 to 18:00'
      
      await user.type(chatInput, vehicleMessage)
      
      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      // Wait for response and data update
      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalled()
        const modifiedData = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0]
        
        // Should have more resources than original
        expect(modifiedData.resources.length).toBeGreaterThan(originalData.resources.length)
        
        // Should contain the new vehicle
        const newVehicle = modifiedData.resources.find((resource: any) => 
          resource.name === 'truck_3' || 
          resource.name?.includes('truck_3') ||
          (resource.capacity && resource.capacity.includes(2000))
        )
        expect(newVehicle).toBeDefined()
        
        if (newVehicle) {
          expect(newVehicle.shifts).toBeDefined()
          expect(newVehicle.shifts.length).toBeGreaterThan(0)
        }
      }, { timeout: TEST_TIMEOUT })

    }, TEST_TIMEOUT)

    it('should provide helpful response when request cannot be fulfilled', async () => {
      const user = userEvent.setup()
      renderVrpJsonEditor()

      // Open assistant
      const assistantButton = screen.getByTestId('vrp-assistant-button')
      await user.click(assistantButton)

      await waitFor(() => {
        expect(screen.getByTestId('chat-input')).toBeInTheDocument()
      })

      const chatInput = screen.getByTestId('chat-input')
      const impossibleMessage = 'Make all vehicles fly and teleport instantly'
      
      await user.type(chatInput, impossibleMessage)
      
      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      // Wait for response
      await waitFor(() => {
        const assistantMessages = screen.getAllByTestId('chat-message')
          .filter(msg => msg.getAttribute('data-type') === 'assistant')
        expect(assistantMessages.length).toBeGreaterThan(0)
        
        // Should contain helpful explanation
        const lastResponse = assistantMessages[assistantMessages.length - 1]
        const responseText = lastResponse.textContent?.toLowerCase() || ''
        
        // Should explain why the request cannot be fulfilled
        expect(
          responseText.includes('cannot') || 
          responseText.includes('unable') || 
          responseText.includes('not possible') ||
          responseText.includes('realistic') ||
          responseText.includes('modify')
        ).toBe(true)
      }, { timeout: TEST_TIMEOUT })

    }, TEST_TIMEOUT)

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Temporarily set invalid API key to trigger error
      const originalEnv = process.env.NEXT_PUBLIC_OPENAI_API_KEY
      process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'sk-invalid-key-for-testing'

      try {
        renderVrpJsonEditor()

        // Open assistant
        const assistantButton = screen.getByTestId('vrp-assistant-button')
        await user.click(assistantButton)

        await waitFor(() => {
          expect(screen.getByTestId('chat-input')).toBeInTheDocument()
        })

        const chatInput = screen.getByTestId('chat-input')
        await user.type(chatInput, 'Add a new job')
        
        const sendButton = screen.getByTestId('send-button')
        await user.click(sendButton)

        // Should show error message
        await waitFor(() => {
          const assistantMessages = screen.getAllByTestId('chat-message')
            .filter(msg => msg.getAttribute('data-type') === 'assistant')
          expect(assistantMessages.length).toBeGreaterThan(0)
          
          const lastResponse = assistantMessages[assistantMessages.length - 1]
          const responseText = lastResponse.textContent?.toLowerCase() || ''
          
          // Should contain error-related terms
          expect(
            responseText.includes('error') || 
            responseText.includes('problem') || 
            responseText.includes('unable') ||
            responseText.includes('try again')
          ).toBe(true)
        }, { timeout: 15000 })

      } finally {
        // Restore original API key
        process.env.NEXT_PUBLIC_OPENAI_API_KEY = originalEnv
      }

    }, TEST_TIMEOUT)

    it('should maintain chat history across interactions', async () => {
      const user = userEvent.setup()
      renderVrpJsonEditor()

      // Open assistant
      const assistantButton = screen.getByTestId('vrp-assistant-button')
      await user.click(assistantButton)

      await waitFor(() => {
        expect(screen.getByTestId('chat-input')).toBeInTheDocument()
      })

      // Send first message
      const chatInput = screen.getByTestId('chat-input')
      await user.type(chatInput, 'Add a job called test_job_1')
      
      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      // Wait for first response
      await waitFor(() => {
        const assistantMessages = screen.getAllByTestId('chat-message')
          .filter(msg => msg.getAttribute('data-type') === 'assistant')
        expect(assistantMessages.length).toBeGreaterThan(0)
      }, { timeout: TEST_TIMEOUT })

      // Send second message
      await user.clear(chatInput)
      await user.type(chatInput, 'Now add another job called test_job_2')
      await user.click(sendButton)

      // Wait for second response
      await waitFor(() => {
        const userMessages = screen.getAllByTestId('chat-message')
          .filter(msg => msg.getAttribute('data-type') === 'user')
        const assistantMessages = screen.getAllByTestId('chat-message')
          .filter(msg => msg.getAttribute('data-type') === 'assistant')
        
        // Should have 2 user messages and at least 2 assistant messages
        expect(userMessages.length).toBe(2)
        expect(assistantMessages.length).toBeGreaterThanOrEqual(2)
        
        // Messages should be preserved
        expect(screen.getByText('Add a job called test_job_1')).toBeInTheDocument()
        expect(screen.getByText('Now add another job called test_job_2')).toBeInTheDocument()
      }, { timeout: TEST_TIMEOUT })

    }, TEST_TIMEOUT)
  })

  describeE2E('Performance and Reliability', () => {
    it('should handle concurrent chat requests gracefully', async () => {
      // This test verifies the system doesn't break under rapid user interaction
      const user = userEvent.setup()
      
      const { container } = render(
        <VrpJsonEditor
          requestData={getSampleVrpData('simple')}
          onChange={jest.fn()}
          onValidationChange={jest.fn()}
          apiKeyStatus={{ type: 'user', masked: 'sk-test...key' }}
        />
      )

      // Open assistant
      const assistantButton = screen.getByTestId('vrp-assistant-button')
      await user.click(assistantButton)

      await waitFor(() => {
        expect(screen.getByTestId('chat-input')).toBeInTheDocument()
      })

      const chatInput = screen.getByTestId('chat-input')
      const sendButton = screen.getByTestId('send-button')

      // Send message and immediately send another (simulating fast user)
      await user.type(chatInput, 'Add job 1')
      await user.click(sendButton)
      
      // Quickly send another message
      await user.type(chatInput, 'Add job 2')
      await user.click(sendButton)

      // Should handle both requests without crashing
      await waitFor(() => {
        const userMessages = screen.getAllByTestId('chat-message')
          .filter(msg => msg.getAttribute('data-type') === 'user')
        expect(userMessages.length).toBe(2)
        
        // UI should not be in a broken state
        expect(chatInput).toBeInTheDocument()
        expect(sendButton).toBeInTheDocument()
      }, { timeout: TEST_TIMEOUT })

    }, TEST_TIMEOUT)

    it('should validate all modified VRP data maintains schema compliance', async () => {
      const user = userEvent.setup()
      const onChangeMock = jest.fn()
      
      render(
        <VrpJsonEditor
          requestData={getSampleVrpData('complex')}
          onChange={onChangeMock}
          onValidationChange={jest.fn()}
          apiKeyStatus={{ type: 'user', masked: 'sk-test...key' }}
        />
      )

      // Open assistant
      const assistantButton = screen.getByTestId('vrp-assistant-button')
      await user.click(assistantButton)

      await waitFor(() => {
        expect(screen.getByTestId('chat-input')).toBeInTheDocument()
      })

      const chatInput = screen.getByTestId('chat-input')
      const sendButton = screen.getByTestId('send-button')

      // Test complex modification
      await user.type(chatInput, 'Add 3 new jobs with different priorities and time windows, and add 2 new vehicles with different capacities')
      await user.click(sendButton)

      // Wait for modification and validate
      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalled()
        const modifiedData = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0]
        
        // All modified data must pass validation
        const validation = validateVrpRequest(modifiedData)
        if (!validation.valid) {
          console.error('Validation errors:', validation.errors)
          console.error('Modified data:', JSON.stringify(modifiedData, null, 2))
        }
        expect(validation.valid).toBe(true)
      }, { timeout: TEST_TIMEOUT })

    }, TEST_TIMEOUT)
  })
})