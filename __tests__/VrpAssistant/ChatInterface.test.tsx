import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInterface } from '@/components/VrpAssistant/ChatInterface'
import { VrpAssistantProvider } from '@/components/VrpAssistant/VrpAssistantContext'

const renderChatInterface = () => {
  return render(
    <VrpAssistantProvider>
      <ChatInterface />
    </VrpAssistantProvider>
  )
}

describe('ChatInterface', () => {
  it('renders chat interface with message area and input', () => {
    renderChatInterface()
    
    expect(screen.getByTestId('chat-messages')).toBeInTheDocument()
    expect(screen.getByTestId('chat-input')).toBeInTheDocument()
    expect(screen.getByTestId('send-button')).toBeInTheDocument()
  })

  it('displays welcome message on first load', () => {
    renderChatInterface()
    
    expect(screen.getByText(/Hello! I'm your VRP Assistant/)).toBeInTheDocument()
    expect(screen.getByText(/I can help you modify your VRP request/)).toBeInTheDocument()
  })

  it('has proper input placeholder text', () => {
    renderChatInterface()
    
    const input = screen.getByPlaceholderText('Ask me to modify your VRP request...')
    expect(input).toBeInTheDocument()
  })

  it('send button is initially disabled with empty input', () => {
    renderChatInterface()
    
    const sendButton = screen.getByTestId('send-button')
    expect(sendButton).toBeDisabled()
  })

  it('enables send button when input has text', () => {
    renderChatInterface()
    
    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('send-button')
    
    fireEvent.change(input, { target: { value: 'Hello' } })
    expect(sendButton).not.toBeDisabled()
  })

  it('has proper styling classes for chat layout', () => {
    renderChatInterface()
    
    const container = screen.getByTestId('chat-interface')
    expect(container).toHaveClass('flex', 'flex-col', 'h-full')
    
    const messagesArea = screen.getByTestId('chat-messages')
    expect(messagesArea).toHaveClass('flex-1', 'overflow-y-auto', 'p-4')
    
    const inputArea = screen.getByTestId('chat-input-area')
    expect(inputArea).toHaveClass('border-t', 'bg-background', 'p-4')
  })

  it('input form has proper flex layout', () => {
    renderChatInterface()
    
    const form = screen.getByTestId('chat-form')
    expect(form).toHaveClass('flex', 'gap-2')
    
    const input = screen.getByTestId('chat-input')
    expect(input).toHaveClass('flex-1')
  })

  it('send button has proper icon and styling', () => {
    renderChatInterface()
    
    const sendButton = screen.getByTestId('send-button')
    expect(sendButton).toHaveClass('shrink-0')
    expect(sendButton).toHaveAttribute('type', 'submit')
    expect(sendButton).toHaveAttribute('aria-label', 'Send message')
  })
})