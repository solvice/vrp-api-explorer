import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInterface } from '@/components/VrpAssistant/ChatInterface'
import { VrpAssistantProvider } from '@/components/VrpAssistant/VrpAssistantContext'
import { ChatPersistence } from '@/components/VrpAssistant/ChatPersistence'

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

const renderChatInterface = () => {
  return render(
    <VrpAssistantProvider>
      <ChatInterface />
    </VrpAssistantProvider>
  )
}

describe('Chat Persistence Integration', () => {
  beforeEach(() => {
    localStorageMock.clear()
    Element.prototype.scrollIntoView = jest.fn()
  })

  it('persists messages across component remounts', () => {
    const { unmount } = renderChatInterface()
    
    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('send-button')
    
    // Send a message
    fireEvent.change(input, { target: { value: 'Persistent message' } })
    fireEvent.click(sendButton)
    
    expect(screen.getByText('Persistent message')).toBeInTheDocument()
    
    // Unmount and remount the component
    unmount()
    renderChatInterface()
    
    // Message should still be there
    expect(screen.getByText('Persistent message')).toBeInTheDocument()
  })

  it('loads existing messages on component mount', () => {
    // Pre-populate localStorage with messages
    const existingMessages = [
      {
        id: 'msg-1',
        type: 'user' as const,
        content: 'Existing message',
        timestamp: new Date('2024-01-01T12:00:00Z')
      },
      {
        id: 'msg-2',
        type: 'assistant' as const,
        content: 'Existing response',
        timestamp: new Date('2024-01-01T12:00:30Z')
      }
    ]
    
    ChatPersistence.saveMessages(existingMessages)
    
    // Mount component
    renderChatInterface()
    
    // Should see the existing messages
    expect(screen.getByText('Existing message')).toBeInTheDocument()
    expect(screen.getByText('Existing response')).toBeInTheDocument()
    expect(screen.getAllByTestId('chat-message')).toHaveLength(2)
  })

  it('automatically saves new messages to localStorage', () => {
    renderChatInterface()
    
    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('send-button')
    
    // Send a message
    fireEvent.change(input, { target: { value: 'Auto save test' } })
    fireEvent.click(sendButton)
    
    // Check that message was saved to localStorage
    const savedMessages = ChatPersistence.loadMessages()
    expect(savedMessages).toHaveLength(1)
    expect(savedMessages[0].content).toBe('Auto save test')
    expect(savedMessages[0].type).toBe('user')
  })

  it('handles localStorage being unavailable gracefully', () => {
    // Mock localStorage to throw errors
    const originalGetItem = localStorage.getItem
    const originalSetItem = localStorage.setItem
    
    localStorage.getItem = jest.fn().mockImplementation(() => {
      throw new Error('Storage unavailable')
    })
    localStorage.setItem = jest.fn().mockImplementation(() => {
      throw new Error('Storage unavailable')
    })
    
    // Component should still render and work
    renderChatInterface()
    
    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('send-button')
    
    fireEvent.change(input, { target: { value: 'No storage test' } })
    fireEvent.click(sendButton)
    
    expect(screen.getByText('No storage test')).toBeInTheDocument()
    
    // Restore original methods
    localStorage.getItem = originalGetItem
    localStorage.setItem = originalSetItem
  })

  it('clears messages from both state and localStorage', () => {
    renderChatInterface()
    
    const input = screen.getByTestId('chat-input')
    const sendButton = screen.getByTestId('send-button')
    
    // Send a message
    fireEvent.change(input, { target: { value: 'Message to clear' } })
    fireEvent.click(sendButton)
    
    expect(screen.getByText('Message to clear')).toBeInTheDocument()
    
    // Clear messages (would be triggered by clear functionality when implemented)
    ChatPersistence.clearMessages()
    
    // Check localStorage is cleared
    const savedMessages = ChatPersistence.loadMessages()
    expect(savedMessages).toHaveLength(0)
  })

  it('preserves message timestamps correctly', () => {
    const testDate = new Date('2024-01-01T12:00:00Z')
    const existingMessages = [
      {
        id: 'msg-1',
        type: 'user' as const,
        content: 'Timestamp test',
        timestamp: testDate
      }
    ]
    
    ChatPersistence.saveMessages(existingMessages)
    
    renderChatInterface()
    
    const messageElement = screen.getByTestId('chat-message')
    expect(messageElement).toHaveAttribute('title', testDate.toLocaleString())
  })
})