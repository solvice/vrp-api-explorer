'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Pencil, BarChart3, FileJson } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VrpAssistantPane } from './VrpAssistantPane'
import { useVrpAssistant } from './VrpAssistantContext'
import { useMobileDetection } from '@/lib/hooks/useMobileDetection'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcut'

export function VrpAssistantContainer() {
  const { messages, isOpen, chatMode, toggleAssistant, closeAssistant } = useVrpAssistant()
  const isMobile = useMobileDetection()
  const [isClient, setIsClient] = useState(false)

  // Hydration fix: only show notification badge after client-side hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      config: { key: 'k', ctrlOrCmd: true, preventDefault: true },
      callback: toggleAssistant,
      deps: [toggleAssistant]
    },
    {
      config: { key: 'Escape', enabled: isOpen },
      callback: closeAssistant,
      deps: [closeAssistant, isOpen]
    }
  ])

  // Check if there are any messages (for notification badge) - only after hydration
  const hasMessages = isClient && messages.length > 0

  // Mode icon mapping
  const modeIcons = {
    modify: Pencil,
    analyze: BarChart3,
    convert: FileJson,
  }

  const ModeIcon = modeIcons[chatMode]

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
        <SheetHeader className="border-b bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <SheetTitle className="text-sm">VRP AI Assistant</SheetTitle>
            </div>
            <Badge variant="secondary" className="gap-1.5">
              <ModeIcon className="h-3 w-3" />
              <span className="capitalize">{chatMode}</span>
            </Badge>
          </div>
          <SheetDescription className="text-xs">
            Powered by OpenAI • Press Shift+Tab to change mode
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