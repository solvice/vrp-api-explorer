'use client'

import React from 'react'

export type MessageType = 'user' | 'assistant' | 'system' | 'error'

export interface ChatMessageProps {
  type: MessageType
  content: string
  timestamp: Date
}

export function ChatMessage({ type, content, timestamp }: ChatMessageProps) {
  const getMessageAlignment = () => {
    return type === 'user' ? 'justify-end' : 'justify-start'
  }

  const getMessageStyling = () => {
    switch (type) {
      case 'user':
        return 'bg-primary text-primary-foreground'
      case 'assistant':
        return 'bg-muted'
      case 'system':
        return 'bg-secondary text-secondary-foreground'
      case 'error':
        return 'bg-destructive text-destructive-foreground'
      default:
        return 'bg-muted'
    }
  }

  return (
    <div 
      data-testid="chat-message"
      data-type={type}
      className={`flex ${getMessageAlignment()}`}
      title={timestamp.toLocaleString()}
    >
      <div 
        data-testid="message-content"
        className={`rounded-lg p-3 max-w-[80%] text-sm whitespace-pre-wrap ${getMessageStyling()}`}
      >
        {content}
      </div>
    </div>
  )
}