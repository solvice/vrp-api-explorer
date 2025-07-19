import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VrpJsonEditor } from '../components/VrpJsonEditor'
import { getSampleVrpData } from '../lib/sample-data'

// Mock the JSON viewer component
jest.mock('@uiw/react-json-view', () => ({
  __esModule: true,
  default: ({ value, onChange, displayDataTypes, displayObjectSize, editable, enableClipboard, ...props }: any) => (
    <div 
      data-testid="json-editor" 
      data-display-data-types={displayDataTypes}
      data-display-object-size={displayObjectSize}
      data-editable={editable !== false ? 'true' : 'false'}
      data-enable-clipboard={enableClipboard}
      {...props}
    >
      <textarea
        data-testid="json-textarea"
        defaultValue={JSON.stringify(value, null, 2)}
        readOnly={editable === false}
        onChange={(e) => {
          if (editable === false) return
          try {
            const parsed = JSON.parse(e.target.value)
            onChange?.(parsed)
          } catch (error) {
            // Invalid JSON - do nothing
          }
        }}
      />
    </div>
  )
}))

describe('VrpJsonEditor', () => {
  const sampleData = getSampleVrpData()
  const mockOnChange = jest.fn()
  const mockOnValidationChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Request Editor', () => {
    it('should render JSON editor with sample data', () => {
      render(
        <VrpJsonEditor
          requestData={sampleData}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      )

      expect(screen.getByTestId('json-editor')).toBeInTheDocument()
      expect(screen.getByTestId('json-textarea')).toBeInTheDocument()
    })

    it('should show validation status for valid data', () => {
      render(
        <VrpJsonEditor
          requestData={sampleData}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      )

      expect(screen.getByText(/valid/i)).toBeInTheDocument()
      expect(screen.getByTestId('validation-status')).toHaveClass('text-green-600')
    })

    it('should call onChange when JSON is modified', async () => {
      render(
        <VrpJsonEditor
          requestData={sampleData}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      )

      const textarea = screen.getByTestId('json-textarea')
      const modifiedData = { ...sampleData, label: 'Modified Label' }
      
      fireEvent.change(textarea, {
        target: { value: JSON.stringify(modifiedData, null, 2) }
      })

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(modifiedData)
      })
    })

    it('should show validation errors for invalid data', async () => {
      render(
        <VrpJsonEditor
          requestData={sampleData}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      )

      const textarea = screen.getByTestId('json-textarea')
      const invalidData = { jobs: [] } // Missing required resources field
      
      fireEvent.change(textarea, {
        target: { value: JSON.stringify(invalidData, null, 2) }
      })

      await waitFor(() => {
        expect(screen.getByText(/invalid/i)).toBeInTheDocument()
        expect(screen.getByTestId('validation-status')).toHaveClass('text-red-600')
      })
    })

    it('should call onValidationChange with validation result', async () => {
      render(
        <VrpJsonEditor
          requestData={sampleData}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      )

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith({
          valid: true,
          errors: []
        })
      })
    })

    it('should display validation error messages', async () => {
      render(
        <VrpJsonEditor
          requestData={{ jobs: [] }} // Invalid data
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/resources/i)).toBeInTheDocument()
        expect(mockOnValidationChange).toHaveBeenCalledWith({
          valid: false,
          errors: expect.arrayContaining([expect.stringContaining('resources')])
        })
      })
    })
  })

  describe('Response Display', () => {
    const sampleResponse = {
      trips: [
        {
          resourceName: 'vehicle_east',
          visits: [
            {
              jobName: 'delivery_alexanderplatz',
              arrivalTime: '2024-01-15T09:00:00Z'
            }
          ]
        }
      ]
    }

    it('should render response when provided', () => {
      render(
        <VrpJsonEditor
          requestData={sampleData}
          responseData={sampleResponse}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      )

      expect(screen.getByText(/response/i)).toBeInTheDocument()
      expect(screen.getAllByTestId('json-editor')).toHaveLength(2) // Request + Response
    })

    it('should not render response section when no response', () => {
      render(
        <VrpJsonEditor
          requestData={sampleData}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      )

      expect(screen.queryByText(/response/i)).not.toBeInTheDocument()
      expect(screen.getAllByTestId('json-editor')).toHaveLength(1) // Only request
    })

    it('should render response as read-only', () => {
      render(
        <VrpJsonEditor
          requestData={sampleData}
          responseData={sampleResponse}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      )

      const jsonEditors = screen.getAllByTestId('json-editor')
      const responseEditor = jsonEditors[1]
      
      expect(responseEditor).toHaveAttribute('data-editable', 'false')
    })
  })

  describe('UI Configuration', () => {
    it('should configure JSON editor with proper settings', () => {
      render(
        <VrpJsonEditor
          requestData={sampleData}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      )

      const editor = screen.getByTestId('json-editor')
      expect(editor).toHaveAttribute('data-display-data-types', 'false')
      expect(editor).toHaveAttribute('data-display-object-size', 'false')
    })

    it('should be editable for request data', () => {
      render(
        <VrpJsonEditor
          requestData={sampleData}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      )

      const editor = screen.getByTestId('json-editor')
      expect(editor).not.toHaveAttribute('data-editable', 'false')
    })
  })

  describe('Loading State', () => {
    it('should show loading state when isLoading is true', () => {
      render(
        <VrpJsonEditor
          requestData={sampleData}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
          isLoading={true}
        />
      )

      expect(screen.getByText(/validating/i)).toBeInTheDocument()
    })

    it('should not show loading state when isLoading is false', () => {
      render(
        <VrpJsonEditor
          requestData={sampleData}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
          isLoading={false}
        />
      )

      expect(screen.queryByText(/validating/i)).not.toBeInTheDocument()
    })
  })
})