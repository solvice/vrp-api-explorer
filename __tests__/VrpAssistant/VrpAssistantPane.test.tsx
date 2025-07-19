import { render, screen, fireEvent } from '@testing-library/react'
import { VrpAssistantPane } from '@/components/VrpAssistant/VrpAssistantPane'
import { VrpAssistantProvider, useVrpAssistant } from '@/components/VrpAssistant/VrpAssistantContext'

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

  it('displays chat interface when open', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
        <TestComponent />
      </VrpAssistantProvider>
    )

    // Open the pane
    fireEvent.click(screen.getByTestId('toggle'))
    
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
    expect(screen.getByText(/Hello! I'm your VRP Assistant/)).toBeInTheDocument()
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

  it('contains chat interface components', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
        <TestComponent />
      </VrpAssistantProvider>
    )

    // Open the pane
    fireEvent.click(screen.getByTestId('toggle'))
    
    // Should contain chat interface elements
    expect(screen.getByTestId('chat-messages')).toBeInTheDocument()
    expect(screen.getByTestId('chat-input')).toBeInTheDocument()
    expect(screen.getByTestId('send-button')).toBeInTheDocument()
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