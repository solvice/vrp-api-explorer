import { render, screen, fireEvent } from '@testing-library/react'
import { ShadcnChatInterface } from '@/components/VrpAssistant/ShadcnChatInterface'
import { VrpAssistantProvider } from '@/components/VrpAssistant/VrpAssistantContext'

const renderShadcnChatInterface = () => {
  return render(
    <VrpAssistantProvider>
      <ShadcnChatInterface />
    </VrpAssistantProvider>
  )
}

describe('Chat Message Management', () => {
  beforeEach(() => {
    localStorage.clear()
    // Mock scrollIntoView for all tests
    Element.prototype.scrollIntoView = jest.fn()
  })

  it('adds user message when form is submitted', () => {
    renderShadcnChatInterface()
    
    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('send-button')
    
    fireEvent.change(input, { target: { value: 'Add a new vehicle' } })
    fireEvent.click(sendButton)
    
    expect(screen.getByText('Add a new vehicle')).toBeInTheDocument()
    expect(screen.getByTestId('chat-message')).toHaveAttribute('data-type', 'user')
  })

  it('clears input after sending message', () => {
    renderShadcnChatInterface()
    
    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('send-button')
    
    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)
    
    expect(input).toHaveValue('')
  })

  it('adds multiple messages in sequence', () => {
    renderShadcnChatInterface()
    
    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('send-button')
    
    fireEvent.change(input, { target: { value: 'First message' } })
    fireEvent.click(sendButton)
    
    fireEvent.change(input, { target: { value: 'Second message' } })
    fireEvent.click(sendButton)
    
    expect(screen.getByText('First message')).toBeInTheDocument()
    expect(screen.getByText('Second message')).toBeInTheDocument()
    expect(screen.getAllByTestId('chat-message')).toHaveLength(2)
  })

  it('handles form submission with Enter key', () => {
    renderShadcnChatInterface()
    
    const input = screen.getByTestId('chat-input')
    
    fireEvent.change(input, { target: { value: 'Enter key message' } })
    fireEvent.submit(screen.getByTestId('chat-form'))
    
    expect(screen.getByText('Enter key message')).toBeInTheDocument()
  })

  it('ignores empty or whitespace-only messages', () => {
    renderShadcnChatInterface()
    
    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('send-button')
    
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(sendButton)
    
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(sendButton)
    
    expect(screen.queryByTestId('chat-message')).not.toBeInTheDocument()
  })

  it('scrolls to bottom when new message is added', () => {
    const mockScrollIntoView = jest.fn()
    Element.prototype.scrollIntoView = mockScrollIntoView
    
    renderShadcnChatInterface()
    
    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('send-button')
    
    fireEvent.change(input, { target: { value: 'Test scroll' } })
    fireEvent.click(sendButton)
    
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  it('displays proper timestamp for messages', () => {
    renderShadcnChatInterface()
    
    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('send-button')
    
    fireEvent.change(input, { target: { value: 'Timestamp test' } })
    fireEvent.click(sendButton)
    
    const messageElement = screen.getByTestId('chat-message')
    expect(messageElement).toHaveAttribute('title')
    expect(messageElement.getAttribute('title')).toMatch(/\d+\/\d+\/\d+, \d+:\d+:\d+ [AP]M/)
  })
})