import { render, screen, fireEvent } from '@testing-library/react'
import { VrpAssistantPane } from '@/components/VrpAssistant/VrpAssistantPane'
import { VrpAssistantProvider, useVrpAssistant } from '@/components/VrpAssistant/VrpAssistantContext'

// Mock the resizable components to avoid ES module issues in Jest
jest.mock('../../components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children, direction }: any) => 
    <div data-panel-group data-direction={direction}>{children}</div>,
  ResizablePanel: ({ children, defaultSize, minSize }: any) => 
    <div data-panel data-default-size={defaultSize} data-min-size={minSize}>{children}</div>,
  ResizableHandle: ({ withHandle }: any) => 
    <div data-resize-handle data-with-handle={withHandle} />
}))

// Mock component to control context state for testing
const TestComponent = () => {
  const { isOpen, togglePane } = useVrpAssistant()
  return (
    <div>
      <button data-testid="toggle" onClick={togglePane}>Toggle</button>
      <span data-testid="is-open">{isOpen.toString()}</span>
    </div>
  )
}

describe('VrpAssistantPane', () => {
  it('does not render when isOpen is false', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
        <TestComponent />
      </VrpAssistantProvider>
    )

    expect(screen.getByTestId('is-open')).toHaveTextContent('false')
    expect(screen.queryByTestId('vrp-assistant-pane')).not.toBeInTheDocument()
  })

  it('renders when isOpen is true', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
        <TestComponent />
      </VrpAssistantProvider>
    )

    // Open the pane
    fireEvent.click(screen.getByTestId('toggle'))
    
    expect(screen.getByTestId('is-open')).toHaveTextContent('true')
    expect(screen.getByTestId('vrp-assistant-pane')).toBeInTheDocument()
  })

  it('displays placeholder content when open', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
        <TestComponent />
      </VrpAssistantProvider>
    )

    // Open the pane
    fireEvent.click(screen.getByTestId('toggle'))
    
    expect(screen.getByText('VRP Assistant Chat')).toBeInTheDocument()
  })

  it('has correct CSS classes for styling', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
        <TestComponent />
      </VrpAssistantProvider>
    )

    // Open the pane
    fireEvent.click(screen.getByTestId('toggle'))
    
    const pane = screen.getByTestId('vrp-assistant-pane')
    expect(pane).toHaveClass('h-full', 'bg-background', 'border-t')
  })

  it('uses ResizablePanelGroup structure', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
        <TestComponent />
      </VrpAssistantProvider>
    )

    // Open the pane
    fireEvent.click(screen.getByTestId('toggle'))
    
    // Should contain resizable panel elements
    expect(screen.getByTestId('vrp-assistant-pane').querySelector('[data-panel-group]')).toBeInTheDocument()
  })

  it('handles smooth transitions when opening/closing', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
        <TestComponent />
      </VrpAssistantProvider>
    )

    // Initially closed
    expect(screen.queryByTestId('vrp-assistant-pane')).not.toBeInTheDocument()
    
    // Open
    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('vrp-assistant-pane')).toBeInTheDocument()
    
    // Close
    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.queryByTestId('vrp-assistant-pane')).not.toBeInTheDocument()
  })
})