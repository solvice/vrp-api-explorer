'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { useVrpAssistant } from './VrpAssistantContext'

export function ChatInterface() {
  const [message, setMessage] = useState('')
  const { messages, addMessage } = useVrpAssistant()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current?.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    
    addMessage('user', message)
    setMessage('')
  }

  return (
    <div data-testid="chat-interface" className="flex flex-col h-full">
      {/* Messages Area */}
      <div data-testid="chat-messages" className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome Message - only show if no messages */}
        {messages.length === 0 && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3 max-w-[80%]">
              <p className="text-sm">
                Hello! I&apos;m your VRP Assistant. I can help you modify your VRP request using natural language.
              </p>
              <p className="text-sm mt-2 text-muted-foreground">
                Try saying things like:
              </p>
              <ul className="text-sm mt-1 text-muted-foreground list-disc list-inside">
                <li>&quot;Add a new vehicle with capacity 100&quot;</li>
                <li>&quot;Change the depot location to London&quot;</li>
                <li>&quot;Add time windows to all locations&quot;</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Chat Messages */}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            type={msg.type}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div data-testid="chat-input-area" className="border-t bg-background p-4">
        <form data-testid="chat-form" onSubmit={handleSubmit} className="flex gap-2">
          <Input
            data-testid="chat-input"
            type="text"
            placeholder="Ask me to modify your VRP request..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1"
          />
          <Button
            data-testid="send-button"
            type="submit"
            disabled={!message.trim()}
            className="shrink-0"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}