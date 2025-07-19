import { ChatPersistence } from '@/components/VrpAssistant/ChatPersistence'
import { ChatMessage } from '@/components/VrpAssistant/VrpAssistantContext'

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

describe('ChatPersistence', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('saves chat messages to localStorage', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        type: 'user',
        content: 'Add a new vehicle',
        timestamp: new Date('2024-01-01T12:00:00Z')
      },
      {
        id: 'msg-2', 
        type: 'assistant',
        content: 'I will add a new vehicle for you',
        timestamp: new Date('2024-01-01T12:00:30Z')
      }
    ]

    ChatPersistence.saveMessages(messages)

    const savedData = localStorage.getItem('vrp-assistant-chat-history')
    expect(savedData).not.toBeNull()
    
    const parsedData = JSON.parse(savedData!)
    expect(parsedData).toHaveLength(2)
    expect(parsedData[0].content).toBe('Add a new vehicle')
    expect(parsedData[1].content).toBe('I will add a new vehicle for you')
  })

  it('loads chat messages from localStorage', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        type: 'user',
        content: 'Test message',
        timestamp: new Date('2024-01-01T12:00:00Z')
      }
    ]

    // Manually save to localStorage
    localStorage.setItem('vrp-assistant-chat-history', JSON.stringify(messages))

    const loadedMessages = ChatPersistence.loadMessages()
    
    expect(loadedMessages).toHaveLength(1)
    expect(loadedMessages[0].content).toBe('Test message')
    expect(loadedMessages[0].type).toBe('user')
    expect(loadedMessages[0].id).toBe('msg-1')
  })

  it('returns empty array when no saved messages exist', () => {
    const loadedMessages = ChatPersistence.loadMessages()
    expect(loadedMessages).toEqual([])
  })

  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem('vrp-assistant-chat-history', 'invalid-json')
    
    const loadedMessages = ChatPersistence.loadMessages()
    expect(loadedMessages).toEqual([])
  })

  it('clears chat history from localStorage', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        type: 'user',
        content: 'Test message',
        timestamp: new Date('2024-01-01T12:00:00Z')
      }
    ]

    ChatPersistence.saveMessages(messages)
    expect(localStorage.getItem('vrp-assistant-chat-history')).not.toBeNull()

    ChatPersistence.clearMessages()
    expect(localStorage.getItem('vrp-assistant-chat-history')).toBeNull()
  })

  it('handles localStorage quota exceeded error', () => {
    const originalSetItem = localStorage.setItem
    localStorage.setItem = jest.fn().mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        type: 'user',
        content: 'Test message',
        timestamp: new Date('2024-01-01T12:00:00Z')
      }
    ]

    expect(() => ChatPersistence.saveMessages(messages)).not.toThrow()

    localStorage.setItem = originalSetItem
  })

  it('handles localStorage access denied error', () => {
    const originalGetItem = localStorage.getItem
    localStorage.getItem = jest.fn().mockImplementation(() => {
      throw new Error('Access denied')
    })

    const loadedMessages = ChatPersistence.loadMessages()
    expect(loadedMessages).toEqual([])

    localStorage.getItem = originalGetItem
  })

  it('properly serializes and deserializes Date objects', () => {
    const testDate = new Date('2024-01-01T12:00:00Z')
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        type: 'user',
        content: 'Test message',
        timestamp: testDate
      }
    ]

    ChatPersistence.saveMessages(messages)
    const loadedMessages = ChatPersistence.loadMessages()

    expect(loadedMessages[0].timestamp).toBeInstanceOf(Date)
    expect(loadedMessages[0].timestamp.getTime()).toBe(testDate.getTime())
  })
})