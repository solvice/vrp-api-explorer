'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { MessageType } from './ChatMessage'

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
    setMessages(prev => [...prev, newMessage])
  }

  const clearMessages = () => {
    setMessages([])
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