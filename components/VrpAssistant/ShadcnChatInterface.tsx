'use client'

import React, { useEffect, useRef } from 'react'
import { useVrpAssistant } from './VrpAssistantContext'
import { ProcessingIndicator } from './ProcessingIndicator'
import { Button } from '@/components/ui/button'
import { MessageList } from '@/components/ui/message-list'

export function ShadcnChatInterface() {
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isProcessing,
    processUserMessage 
  } = useVrpAssistant()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isProcessing])

  const suggestions = [
    "Add a new vehicle with capacity 100",
    "Change the depot location to London", 
    "Add time windows to all locations",
    "Increase vehicle capacity by 20%",
    "Add a priority constraint to urgent deliveries"
  ]

  // Adapt our handleSubmit to match the expected signature
  const adaptedHandleSubmit = (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.()
    handleSubmit()
  }

  // Handle suggestion clicks safely
  const handleSuggestionClick = React.useCallback((suggestion: string) => {
    if (!isProcessing) {
      processUserMessage(suggestion)
    }
  }, [processUserMessage, isProcessing])

  return (
    <div 
      className="h-full flex flex-col" 
      role="region"
      aria-label="VRP AI Assistant Chat Interface"
    >
      {/* Messages area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {messages.length === 0 ? (
          /* Initial suggestions */
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Try these suggestions to get started:
            </p>
            <div className="grid gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isProcessing}
                  className="text-left justify-start h-auto p-3 whitespace-normal"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div ref={scrollAreaRef} className="flex-1 overflow-y-auto min-h-0">
            <MessageList
              messages={messages}
              isTyping={isProcessing}
            />
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Enhanced processing indicator with accessibility */}
      {isProcessing && (
        <div 
          className="p-3 border-t"
          role="status"
          aria-live="polite"
          aria-label="AI processing status"
        >
          <ProcessingIndicator
            state="processing"
            message="AI is analyzing your VRP request..."
          />
        </div>
      )}

      {/* Input area */}
      <div className="border-t p-4">
        <form onSubmit={adaptedHandleSubmit}>
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={handleInputChange}
              data-testid="chat-input"
              placeholder="Ask me to modify your VRP data..."
              disabled={isProcessing}
              className="flex-1 min-h-[44px] max-h-32 p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  adaptedHandleSubmit()
                }
              }}
            />
            <Button
              type="submit"
              data-testid="send-button"
              disabled={!input.trim() || isProcessing}
              size="sm"
              className="px-4"
            >
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}