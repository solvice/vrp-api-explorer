import { useState, useEffect, useCallback } from 'react'
import { Message, ExecutionMetadata } from '@/components/ui/chat-message'
import { ChatPersistence } from '@/components/VrpAssistant/ChatPersistence'

/**
 * Custom hook for managing VRP Assistant chat messages
 * Handles message state, persistence to localStorage, and message operations
 */
export function useVrpMessages() {
  const [messages, setMessages] = useState<Message[]>([])

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = ChatPersistence.loadMessages()
    if (savedMessages.length > 0) {
      setMessages(savedMessages)
    }
  }, [])

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      ChatPersistence.saveMessages(messages)
    }
  }, [messages])

  // Add a new message to the conversation
  const addMessage = useCallback((
    role: 'user' | 'assistant' | 'system',
    content: string,
    executionMetadata?: ExecutionMetadata
  ) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content: content.trim(),
      createdAt: new Date(),
      executionMetadata
    }
    setMessages(prev => [...prev, newMessage])
  }, [])

  // Clear all messages and localStorage
  const clearMessages = useCallback(() => {
    setMessages([])
    ChatPersistence.clearMessages()
  }, [])

  return {
    messages,
    addMessage,
    clearMessages
  }
}