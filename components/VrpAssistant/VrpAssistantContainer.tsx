'use client'

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { VrpAssistantPane } from './VrpAssistantPane'
import { useVrpAssistant } from './VrpAssistantContext'

export function VrpAssistantContainer() {
  const { messages, isOpen, toggleAssistant, closeAssistant } = useVrpAssistant()
  const [isMobile, setIsMobile] = useState(false)

  // Check mobile viewport
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches)
    }

    checkIsMobile()
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    mediaQuery.addEventListener('change', checkIsMobile)

    return () => {
      mediaQuery.removeEventListener('change', checkIsMobile)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K to toggle assistant
      if ((event.ctrlKey || event.metaKey) && event.key === 'k' && !event.shiftKey) {
        event.preventDefault()
        toggleAssistant()
      }
      // Escape to close when open
      if (event.key === 'Escape' && isOpen) {
        closeAssistant()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, toggleAssistant, closeAssistant])

  // Check if there are any unread messages (for notification badge)
  const hasMessages = messages.length > 0

  return (
    <Sheet open={isOpen} onOpenChange={toggleAssistant}>
      {/* Floating Action Button - only show when closed */}
      {!isOpen && (
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            aria-label="Open VRP AI Assistant (Ctrl+K)"
            title="Open VRP AI Assistant (Ctrl+K)"
            data-testid="vrp-assistant-fab"
          >
            <div className="relative">
              <MessageCircle className="h-6 w-6" />
              {hasMessages && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
              )}
            </div>
          </Button>
        </SheetTrigger>
      )}

      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={`p-0 ${isMobile ? "h-[85dvh] rounded-t-xl" : "w-96"}`}
        data-testid="vrp-assistant-panel"
        aria-label="VRP AI Assistant Panel"
        role="complementary"
      >
        {/* Mobile handle indicator */}
        {isMobile && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10" aria-hidden="true">
            <div className="w-8 h-1 bg-muted-foreground/30 rounded-full"></div>
          </div>
        )}

        {/* Panel Header */}
        <SheetHeader className="border-b bg-muted/30">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <SheetTitle className="text-sm">VRP AI Assistant</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Powered by OpenAI
          </SheetDescription>
        </SheetHeader>

        {/* Assistant Content */}
        <div className="flex-1 overflow-hidden">
          <VrpAssistantPane />
        </div>
      </SheetContent>
    </Sheet>
  )
}