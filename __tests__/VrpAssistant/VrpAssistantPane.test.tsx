import { render, screen } from '@testing-library/react'
import { VrpAssistantPane } from '@/components/VrpAssistant/VrpAssistantPane'
import { VrpAssistantProvider } from '@/components/VrpAssistant/VrpAssistantContext'

describe('VrpAssistantPane', () => {
  it('renders the assistant pane', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
      </VrpAssistantProvider>
    )

    expect(screen.getByTestId('vrp-assistant-pane')).toBeInTheDocument()
  })

  it('displays header with title and status indicator', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
      </VrpAssistantProvider>
    )

    expect(screen.getByText('VRP AI Assistant')).toBeInTheDocument()
    expect(screen.getByText('Powered by OpenAI')).toBeInTheDocument()

    // Status indicator (green dot)
    const statusIndicator = screen.getByText('VRP AI Assistant').parentElement?.querySelector('.bg-green-500')
    expect(statusIndicator).toBeInTheDocument()
  })

  it('displays chat interface', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
      </VrpAssistantProvider>
    )

    expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
    expect(screen.getByText(/Hello! I'm your VRP Assistant/)).toBeInTheDocument()
  })

  it('has correct CSS classes for styling', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
      </VrpAssistantProvider>
    )

    const pane = screen.getByTestId('vrp-assistant-pane')
    expect(pane).toHaveClass('h-full', 'bg-background', 'border-t', 'shadow-lg')
  })

  it('has proper accessibility attributes', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
      </VrpAssistantProvider>
    )

    const pane = screen.getByTestId('vrp-assistant-pane')
    expect(pane).toHaveAttribute('role', 'complementary')
    expect(pane).toHaveAttribute('aria-label', 'VRP AI Assistant Panel')
  })

  it('contains chat interface components', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
      </VrpAssistantProvider>
    )

    // Should contain chat interface elements
    expect(screen.getByTestId('chat-messages')).toBeInTheDocument()
    expect(screen.getByTestId('chat-input')).toBeInTheDocument()
    expect(screen.getByTestId('send-button')).toBeInTheDocument()
  })

  it('has proper layout structure', () => {
    render(
      <VrpAssistantProvider>
        <VrpAssistantPane />
      </VrpAssistantProvider>
    )

    const pane = screen.getByTestId('vrp-assistant-pane')

    // Should have flex column layout
    const innerDiv = pane.querySelector('.h-full.flex.flex-col')
    expect(innerDiv).toBeInTheDocument()

    // Should have header and chat interface areas
    const header = screen.getByText('VRP AI Assistant').closest('.border-b')
    expect(header).toBeInTheDocument()

    const chatArea = screen.getByTestId('chat-interface').closest('.flex-1')
    expect(chatArea).toBeInTheDocument()
  })
})