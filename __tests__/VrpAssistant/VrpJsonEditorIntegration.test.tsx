import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VrpJsonEditor } from '@/components/VrpJsonEditor'
import { getSampleVrpData } from '@/lib/sample-data'

// Mock the resizable components
jest.mock('../../components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children, direction }: any) => 
    <div data-panel-group data-direction={direction}>{children}</div>,
  ResizablePanel: ({ children, defaultSize, minSize }: any) => 
    <div data-panel data-default-size={defaultSize} data-min-size={minSize}>{children}</div>,
  ResizableHandle: ({ withHandle }: any) => 
    <div data-resize-handle data-with-handle={withHandle} />
}))

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  Editor: ({ value, onChange }: any) => (
    <textarea 
      data-testid="monaco-editor" 
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
    />
  )
}))

describe('VrpJsonEditor with VRP Assistant Integration', () => {
  const mockProps = {
    requestData: getSampleVrpData('simple'),
    onChange: jest.fn(),
    onValidationChange: jest.fn(),
    onSend: jest.fn(),
    apiKeyStatus: { type: 'demo' as const, masked: 'demo-key' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders VRP Assistant button when integrated', () => {
    render(<VrpJsonEditor {...mockProps} />)
    
    expect(screen.getByRole('button', { name: /vrp assistant/i })).toBeInTheDocument()
  })

  it('shows VRP Assistant pane when button is clicked', async () => {
    render(<VrpJsonEditor {...mockProps} />)
    
    // Initially, pane should not be visible
    expect(screen.queryByTestId('vrp-assistant-pane')).not.toBeInTheDocument()
    
    // Click the assistant button
    const assistantButton = screen.getByRole('button', { name: /vrp assistant/i })
    fireEvent.click(assistantButton)
    
    // Pane should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('vrp-assistant-pane')).toBeInTheDocument()
    })
  })

  it('hides VRP Assistant pane when button is clicked again', async () => {
    render(<VrpJsonEditor {...mockProps} />)
    
    const assistantButton = screen.getByRole('button', { name: /vrp assistant/i })
    
    // Open pane
    fireEvent.click(assistantButton)
    await waitFor(() => {
      expect(screen.getByTestId('vrp-assistant-pane')).toBeInTheDocument()
    })
    
    // Close pane
    fireEvent.click(assistantButton)
    await waitFor(() => {
      expect(screen.queryByTestId('vrp-assistant-pane')).not.toBeInTheDocument()
    })
  })

  it('maintains JSON editor functionality when assistant is open', async () => {
    render(<VrpJsonEditor {...mockProps} />)
    
    // Open assistant pane
    const assistantButton = screen.getByRole('button', { name: /vrp assistant/i })
    fireEvent.click(assistantButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('vrp-assistant-pane')).toBeInTheDocument()
    })
    
    // JSON editor should still be functional
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('uses resizable layout when assistant pane is open', async () => {
    render(<VrpJsonEditor {...mockProps} />)
    
    // Open assistant pane
    const assistantButton = screen.getByRole('button', { name: /vrp assistant/i })
    fireEvent.click(assistantButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('vrp-assistant-pane')).toBeInTheDocument()
    })
    
    // Should have resizable panel group
    expect(screen.getByTestId('vrp-assistant-pane').querySelector('[data-panel-group]')).toBeInTheDocument()
  })

  it('preserves existing VrpJsonEditor props and functionality', () => {
    render(<VrpJsonEditor {...mockProps} />)
    
    // All existing elements should still be present
    expect(screen.getByText('Request')).toBeInTheDocument()
    expect(screen.getByText('POST /v2/vrp/solve/sync')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
  })
})