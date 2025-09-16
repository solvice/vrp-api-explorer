'use client'

import React, { useEffect, useRef } from 'react'
import { useVrpAssistant } from './VrpAssistantContext'
import { ProcessingIndicator } from './ProcessingIndicator'
import { Button } from '@/components/ui/button'
import { MessageList } from '@/components/ui/message-list'
import { Paperclip } from 'lucide-react'

export function ShadcnChatInterface() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isProcessing,
    processUserMessage,
    processCsvUpload
  } = useVrpAssistant()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // CSV file upload handlers
  const handleFileUpload = () => {
    if (!isProcessing) {
      fileInputRef.current?.click()
    }
  }

  const validateCsvFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Check file extension
      if (!file.name.toLowerCase().endsWith('.csv')) {
        reject(new Error('Please select a CSV file'))
        return
      }

      // Check file size (approximate 500 rows limit)
      const maxSizeBytes = 5 * 1024 * 1024 // 5MB as rough limit for 500 rows
      if (file.size > maxSizeBytes) {
        reject(new Error('CSV file is too large. Please ensure it has 500 rows or fewer.'))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        if (!content) {
          reject(new Error('Could not read file content'))
          return
        }

        // Basic CSV validation - count lines
        const lines = content.trim().split('\n')
        if (lines.length > 501) { // 500 data rows + header
          reject(new Error('CSV file exceeds 500 rows limit'))
          return
        }

        // Check for latitude/longitude columns (basic check)
        const header = lines[0]?.toLowerCase() || ''
        const hasLatLon = (
          (header.includes('lat') || header.includes('latitude')) &&
          (header.includes('lon') || header.includes('lng') || header.includes('longitude'))
        )

        if (!hasLatLon) {
          reject(new Error('CSV must contain latitude and longitude columns'))
          return
        }

        resolve(content)
      }

      reader.onerror = () => {
        reject(new Error('Error reading file'))
      }

      reader.readAsText(file)
    })
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const csvContent = await validateCsvFile(file)
      await processCsvUpload(csvContent, file.name)
    } catch (error) {
      // Error handling will be done in processCsvUpload
      console.error('File validation error:', error)
    }

    // Clear the input
    event.target.value = ''
  }

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
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={handleInputChange}
                data-testid="chat-input"
                placeholder="Ask me to modify your VRP data..."
                disabled={isProcessing}
                className="w-full min-h-[44px] max-h-32 p-3 pr-12 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    adaptedHandleSubmit()
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFileUpload}
                disabled={isProcessing}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                title="Upload CSV file"
                aria-label="Upload CSV file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
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

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  )
}