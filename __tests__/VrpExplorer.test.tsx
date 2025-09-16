import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VrpExplorer } from '../components/VrpExplorer'
import { getSampleVrpData } from '../lib/sample-data'

// Mock the VRP API client
const mockSolveVrp = jest.fn()
const mockSetUserApiKey = jest.fn()
const mockGetUserApiKey = jest.fn(() => null)
const mockIsUsingDemoKey = jest.fn(() => true)
const mockGetApiKeyStatus = jest.fn(() => ({ type: 'demo', masked: 'Demo Key' }))

jest.mock('../lib/vrp-api', () => ({
  VrpApiClient: jest.fn().mockImplementation(() => ({
    solveVrp: mockSolveVrp,
    setUserApiKey: mockSetUserApiKey,
    getUserApiKey: mockGetUserApiKey,
    isUsingDemoKey: mockIsUsingDemoKey,
    getApiKeyStatus: mockGetApiKeyStatus
  })),
  VrpApiError: class VrpApiError extends Error {
    constructor(message: string, public type: string) {
      super(message)
    }
  }
}))

// Mock the components
jest.mock('../components/VrpLayout', () => ({
  VrpLayout: ({ leftPanel, centerPanel, rightPanel }: any) => (
    <div data-testid="vrp-layout">
      <div data-testid="left-panel">{leftPanel}</div>
      <div data-testid="center-panel">{centerPanel}</div>
      <div data-testid="right-panel">{rightPanel}</div>
    </div>
  )
}))

jest.mock('../components/VrpJsonEditor', () => ({
  VrpJsonEditor: ({ requestData, responseData, onChange, onValidationChange, isLoading, onSend, disabled, apiKeyStatus, onApiKeyChange }: any) => (
    <div data-testid="vrp-json-editor">
      <div data-testid="request-data">{JSON.stringify(requestData)}</div>
      {responseData && <div data-testid="response-data">{JSON.stringify(responseData)}</div>}
      <button 
        data-testid="change-request"
        onClick={() => onChange({ ...requestData, modified: true })}
      >
        Modify Request
      </button>
      <button 
        data-testid="validation-valid"
        onClick={() => onValidationChange({ valid: true, errors: [] })}
      >
        Set Valid
      </button>
      <button 
        data-testid="validation-invalid"
        onClick={() => onValidationChange({ valid: false, errors: ['Error'] })}
      >
        Set Invalid
      </button>
      <button 
        data-testid="send-button"
        onClick={onSend}
        disabled={disabled || isLoading}
      >
        {isLoading ? 'Solving...' : 'Send'}
      </button>
      <span data-testid="api-status">{apiKeyStatus?.type}</span>
      <button 
        data-testid="api-key-button"
        onClick={() => onApiKeyChange?.('test-key')}
      >
        Change API Key
      </button>
      {isLoading && <span data-testid="editor-loading">Loading...</span>}
    </div>
  )
}))

jest.mock('../components/VrpMap', () => ({
  VrpMap: ({ requestData, responseData }: any) => (
    <div data-testid="vrp-map">
      <div data-testid="map-request">{JSON.stringify(requestData)}</div>
      {responseData && <div data-testid="map-response">{JSON.stringify(responseData)}</div>}
    </div>
  )
}))

jest.mock('../components/VrpAssistant/VrpAssistantPane', () => ({
  VrpAssistantPane: () => <div data-testid="vrp-assistant-pane">AI Assistant</div>
}))

jest.mock('../components/VrpAssistant/VrpAssistantContext', () => ({
  VrpAssistantProvider: ({ children }: any) => <div data-testid="vrp-assistant-provider">{children}</div>
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn()
  },
  Toaster: () => <div data-testid="toaster" />
}))

describe('VrpExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSolveVrp.mockReset()
    mockSetUserApiKey.mockReset()
    mockGetUserApiKey.mockReset()
    mockIsUsingDemoKey.mockReset()
    mockGetApiKeyStatus.mockReset()
    
    // Reset to default values
    mockGetUserApiKey.mockReturnValue(null)
    mockIsUsingDemoKey.mockReturnValue(true)
    mockGetApiKeyStatus.mockReturnValue({ type: 'demo', masked: 'Demo Key' })
  })

  describe('Initial State', () => {
    it('should render all main components', () => {
      render(<VrpExplorer />)

      expect(screen.getByTestId('vrp-layout')).toBeInTheDocument()
      expect(screen.getByTestId('vrp-json-editor')).toBeInTheDocument()
      expect(screen.getByTestId('vrp-map')).toBeInTheDocument()
      expect(screen.getByTestId('toaster')).toBeInTheDocument()
    })

    it('should initialize with sample data', () => {
      render(<VrpExplorer />)

      const requestData = screen.getByTestId('request-data')
      expect(requestData.textContent).toContain('jobs')
      expect(requestData.textContent).toContain('resources')
    })

    it('should show demo API key status', () => {
      render(<VrpExplorer />)

      expect(screen.getByTestId('api-status')).toHaveTextContent('demo')
    })

    it('should have send button enabled for valid data', () => {
      render(<VrpExplorer />)

      // Trigger validation to be valid
      fireEvent.click(screen.getByTestId('validation-valid'))

      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).not.toBeDisabled()
    })
  })

  describe('API Integration', () => {
    it('should call API when send button is clicked', async () => {
      const mockResponse = {
        trips: [
          {
            resourceName: 'vehicle_east',
            visits: [{ jobName: 'delivery_test', sequence: 1 }]
          }
        ]
      }
      mockSolveVrp.mockResolvedValue(mockResponse)

      render(<VrpExplorer />)

      // Set validation to valid
      fireEvent.click(screen.getByTestId('validation-valid'))

      // Click send
      fireEvent.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(mockSolveVrp).toHaveBeenCalled()
      })
    })

    it('should show loading state during API call', async () => {
      mockSolveVrp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<VrpExplorer />)

      // Set validation to valid
      fireEvent.click(screen.getByTestId('validation-valid'))

      // Click send
      fireEvent.click(screen.getByTestId('send-button'))

      // Should show loading state
      expect(screen.getByText('Solving...')).toBeInTheDocument()
      expect(screen.getByTestId('send-button')).toBeDisabled()

      await waitFor(() => {
        expect(screen.queryByText('Solving...')).not.toBeInTheDocument()
      })
    })

    it('should display response data when API call succeeds', async () => {
      const mockResponse = {
        trips: [
          {
            resourceName: 'vehicle_east',
            visits: [{ jobName: 'delivery_test', sequence: 1 }]
          }
        ]
      }
      mockSolveVrp.mockResolvedValue(mockResponse)

      render(<VrpExplorer />)

      // Set validation to valid and send
      fireEvent.click(screen.getByTestId('validation-valid'))
      fireEvent.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(screen.getByTestId('response-data')).toBeInTheDocument()
        expect(screen.getByTestId('map-response')).toBeInTheDocument()
      })
    })

    it('should show error toast when API call fails', async () => {
      const { VrpApiError } = require('../lib/vrp-api')
      const { toast } = require('sonner')
      
      mockSolveVrp.mockRejectedValue(
        new VrpApiError('API Error', 'network')
      )

      render(<VrpExplorer />)

      // Set validation to valid and send
      fireEvent.click(screen.getByTestId('validation-valid'))
      fireEvent.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('API Error')
      })
    })

    it('should disable send button for invalid data', () => {
      render(<VrpExplorer />)

      // Set validation to invalid
      fireEvent.click(screen.getByTestId('validation-invalid'))

      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).toBeDisabled()
    })
  })

  describe('Data Management', () => {
    it('should update request data when JSON editor changes', () => {
      render(<VrpExplorer />)

      // Modify request data
      fireEvent.click(screen.getByTestId('change-request'))

      // Check that map receives updated data
      const mapRequest = screen.getByTestId('map-request')
      expect(mapRequest.textContent).toContain('modified')
    })

    it('should handle API key changes', () => {
      render(<VrpExplorer />)

      // Change API key
      fireEvent.click(screen.getByTestId('api-key-button'))

      expect(mockSetUserApiKey).toHaveBeenCalledWith('test-key')
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const { VrpApiError } = require('../lib/vrp-api')
      const { toast } = require('sonner')
      
      mockSolveVrp.mockRejectedValue(
        new VrpApiError('Invalid API key', 'authentication')
      )

      render(<VrpExplorer />)

      fireEvent.click(screen.getByTestId('validation-valid'))
      fireEvent.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid API key')
      })
    })

    it('should handle network errors', async () => {
      const { VrpApiError } = require('../lib/vrp-api')
      const { toast } = require('sonner')
      
      mockSolveVrp.mockRejectedValue(
        new VrpApiError('Network error', 'network')
      )

      render(<VrpExplorer />)

      fireEvent.click(screen.getByTestId('validation-valid'))
      fireEvent.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error')
      })
    })

    it('should handle validation errors', async () => {
      const { VrpApiError } = require('../lib/vrp-api')
      const { toast } = require('sonner')
      
      mockSolveVrp.mockRejectedValue(
        new VrpApiError('Invalid request data', 'validation')
      )

      render(<VrpExplorer />)

      fireEvent.click(screen.getByTestId('validation-valid'))
      fireEvent.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid request data')
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading in JSON editor during API call', async () => {
      mockSolveVrp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<VrpExplorer />)

      fireEvent.click(screen.getByTestId('validation-valid'))
      fireEvent.click(screen.getByTestId('send-button'))

      expect(screen.getByTestId('editor-loading')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByTestId('editor-loading')).not.toBeInTheDocument()
      })
    })
  })
})