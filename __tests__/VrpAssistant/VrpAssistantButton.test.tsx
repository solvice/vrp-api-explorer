import { render, screen, fireEvent } from '@testing-library/react'
import { VrpAssistantButton } from '@/components/VrpAssistant/VrpAssistantButton'
import { VrpAssistantProvider, useVrpAssistant } from '@/components/VrpAssistant/VrpAssistantContext'

// Mock component to test context integration
const TestComponent = () => {
  const { isOpen, isProcessing, togglePane, setProcessing } = useVrpAssistant()
  return (
    <div>
      <span data-testid="is-open">{isOpen.toString()}</span>
      <span data-testid="is-processing">{isProcessing.toString()}</span>
      <button data-testid="toggle" onClick={togglePane}>Toggle</button>
      <button data-testid="set-processing" onClick={() => setProcessing(true)}>Set Processing</button>
      <button data-testid="set-not-processing" onClick={() => setProcessing(false)}>Set Not Processing</button>
    </div>
  )
}

describe('VrpAssistantContext', () => {
  it('provides initial state values', () => {
    render(
      <VrpAssistantProvider>
        <TestComponent />
      </VrpAssistantProvider>
    )

    expect(screen.getByTestId('is-open')).toHaveTextContent('false')
    expect(screen.getByTestId('is-processing')).toHaveTextContent('false')
  })

  it('toggles pane open/closed state', () => {
    render(
      <VrpAssistantProvider>
        <TestComponent />
      </VrpAssistantProvider>
    )

    expect(screen.getByTestId('is-open')).toHaveTextContent('false')
    
    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('is-open')).toHaveTextContent('true')
    
    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('is-open')).toHaveTextContent('false')
  })

  it('updates processing state', () => {
    render(
      <VrpAssistantProvider>
        <TestComponent />
      </VrpAssistantProvider>
    )

    expect(screen.getByTestId('is-processing')).toHaveTextContent('false')
    
    fireEvent.click(screen.getByTestId('set-processing'))
    expect(screen.getByTestId('is-processing')).toHaveTextContent('true')
    
    fireEvent.click(screen.getByTestId('set-not-processing'))
    expect(screen.getByTestId('is-processing')).toHaveTextContent('false')
  })
})

describe('VrpAssistantButton', () => {
  it('renders with default state', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantButton />
      </VrpAssistantProvider>
    )

    const button = screen.getByRole('button', { name: /vrp assistant/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('fixed', 'top-4', 'right-4')
    
    // Should show Bot icon in default state
    expect(screen.getByTestId('bot-icon')).toBeInTheDocument()
  })

  it('shows loading spinner when processing', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantButton />
        <TestComponent />
      </VrpAssistantProvider>
    )

    // Set processing state
    fireEvent.click(screen.getByTestId('set-processing'))
    
    // Should show loading spinner instead of bot icon
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.queryByTestId('bot-icon')).not.toBeInTheDocument()
  })

  it('shows active state when pane is open', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantButton />
        <TestComponent />
      </VrpAssistantProvider>
    )

    const button = screen.getByRole('button', { name: /vrp assistant/i })
    
    // Initially not active
    expect(button).not.toHaveClass('bg-primary')
    
    // Open pane
    fireEvent.click(screen.getByTestId('toggle'))
    
    // Should show active state
    expect(button).toHaveClass('bg-primary')
  })

  it('toggles pane when clicked', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantButton />
        <TestComponent />
      </VrpAssistantProvider>
    )

    const button = screen.getByRole('button', { name: /vrp assistant/i })
    
    expect(screen.getByTestId('is-open')).toHaveTextContent('false')
    
    fireEvent.click(button)
    expect(screen.getByTestId('is-open')).toHaveTextContent('true')
    
    fireEvent.click(button)
    expect(screen.getByTestId('is-open')).toHaveTextContent('false')
  })

  it('has proper positioning as floating button', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantButton />
      </VrpAssistantProvider>
    )

    const button = screen.getByRole('button', { name: /vrp assistant/i })
    
    // Should be positioned fixed in top-right
    expect(button).toHaveClass('fixed', 'top-4', 'right-4')
    expect(button).toHaveClass('z-50') // High z-index for floating
  })

  it('has accessible attributes', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantButton />
      </VrpAssistantProvider>
    )

    const button = screen.getByRole('button', { name: /vrp assistant/i })
    
    expect(button).toHaveAttribute('aria-label', 'VRP Assistant')
    expect(button).toHaveAttribute('type', 'button')
  })
})