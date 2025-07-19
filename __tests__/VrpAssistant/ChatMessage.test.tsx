import { render, screen } from '@testing-library/react'
import { ChatMessage } from '@/components/VrpAssistant/ChatMessage'

describe('ChatMessage', () => {
  it('renders user message with correct styling', () => {
    render(
      <ChatMessage 
        type="user" 
        content="Add a new vehicle with capacity 100" 
        timestamp={new Date('2024-01-01T12:00:00Z')}
      />
    )
    
    expect(screen.getByTestId('chat-message')).toHaveAttribute('data-type', 'user')
    expect(screen.getByText('Add a new vehicle with capacity 100')).toBeInTheDocument()
    expect(screen.getByTestId('message-content')).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('renders assistant message with correct styling', () => {
    render(
      <ChatMessage 
        type="assistant" 
        content="I'll add a new vehicle with capacity 100 to your VRP request." 
        timestamp={new Date('2024-01-01T12:00:00Z')}
      />
    )
    
    expect(screen.getByTestId('chat-message')).toHaveAttribute('data-type', 'assistant')
    expect(screen.getByText("I'll add a new vehicle with capacity 100 to your VRP request.")).toBeInTheDocument()
    expect(screen.getByTestId('message-content')).toHaveClass('bg-muted')
  })

  it('renders system message with distinct styling', () => {
    render(
      <ChatMessage 
        type="system" 
        content="VRP request updated successfully" 
        timestamp={new Date('2024-01-01T12:00:00Z')}
      />
    )
    
    expect(screen.getByTestId('chat-message')).toHaveAttribute('data-type', 'system')
    expect(screen.getByText('VRP request updated successfully')).toBeInTheDocument()
    expect(screen.getByTestId('message-content')).toHaveClass('bg-secondary', 'text-secondary-foreground')
  })

  it('renders error message with error styling', () => {
    render(
      <ChatMessage 
        type="error" 
        content="Failed to update VRP request" 
        timestamp={new Date('2024-01-01T12:00:00Z')}
      />
    )
    
    expect(screen.getByTestId('chat-message')).toHaveAttribute('data-type', 'error')
    expect(screen.getByText('Failed to update VRP request')).toBeInTheDocument()
    expect(screen.getByTestId('message-content')).toHaveClass('bg-destructive', 'text-destructive-foreground')
  })

  it('displays timestamp on hover', () => {
    const testDate = new Date('2024-01-01T12:00:00Z')
    render(
      <ChatMessage 
        type="user" 
        content="Test message" 
        timestamp={testDate}
      />
    )
    
    const messageElement = screen.getByTestId('chat-message')
    expect(messageElement).toHaveAttribute('title', testDate.toLocaleString())
  })

  it('has proper alignment for user vs assistant messages', () => {
    const { rerender } = render(
      <ChatMessage 
        type="user" 
        content="User message" 
        timestamp={new Date('2024-01-01T12:00:00Z')}
      />
    )
    
    expect(screen.getByTestId('chat-message')).toHaveClass('justify-end')
    
    rerender(
      <ChatMessage 
        type="assistant" 
        content="Assistant message" 
        timestamp={new Date('2024-01-01T12:00:00Z')}
      />
    )
    
    expect(screen.getByTestId('chat-message')).toHaveClass('justify-start')
  })

  it('handles multiline content correctly', () => {
    const multilineContent = "Line 1\nLine 2\nLine 3"
    
    render(
      <ChatMessage 
        type="assistant" 
        content={multilineContent} 
        timestamp={new Date('2024-01-01T12:00:00Z')}
      />
    )
    
    expect(screen.getByTestId('message-content')).toHaveClass('whitespace-pre-wrap')
    // Check that the component preserves newlines by having the whitespace-pre-wrap class
    // and that each line is present in the text
    expect(screen.getByText(/Line 1/)).toBeInTheDocument()
    expect(screen.getByText(/Line 2/)).toBeInTheDocument()
    expect(screen.getByText(/Line 3/)).toBeInTheDocument()
  })
})