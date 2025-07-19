'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { MessageType } from './ChatMessage'
import { ChatPersistence } from './ChatPersistence'

export interface ChatMessage {
  id: string
  type: MessageType
  content: string
  timestamp: Date
}

interface VrpAssistantContextType {
  isOpen: boolean
  isProcessing: boolean
  messages: ChatMessage[]
  togglePane: () => void
  setProcessing: (processing: boolean) => void
  addMessage: (type: MessageType, content: string) => void
  clearMessages: () => void
}

const VrpAssistantContext = createContext<VrpAssistantContextType | undefined>(undefined)

interface VrpAssistantProviderProps {
  children: ReactNode
}

export function VrpAssistantProvider({ children }: VrpAssistantProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessingState] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])

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

  const togglePane = () => {
    setIsOpen(prev => !prev)
  }

  const setProcessing = (processing: boolean) => {
    setIsProcessingState(processing)
  }

  const addMessage = (type: MessageType, content: string) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: content.trim(),
      timestamp: new Date()
    }
    setMessages(prev => {
      const updatedMessages = [...prev, newMessage]
      return updatedMessages
    })
  }

  const clearMessages = () => {
    setMessages([])
    ChatPersistence.clearMessages()
  }

  const value: VrpAssistantContextType = {
    isOpen,
    isProcessing,
    messages,
    togglePane,
    setProcessing,
    addMessage,
    clearMessages
  }

  return (
    <VrpAssistantContext.Provider value={value}>
      {children}
    </VrpAssistantContext.Provider>
  )
}

export function useVrpAssistant() {
  const context = useContext(VrpAssistantContext)
  if (context === undefined) {
    throw new Error('useVrpAssistant must be used within a VrpAssistantProvider')
  }
  return context
}