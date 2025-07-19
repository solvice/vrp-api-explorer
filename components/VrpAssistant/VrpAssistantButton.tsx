'use client'

import { Bot, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVrpAssistant } from './VrpAssistantContext'
import { cn } from '@/lib/utils'

export function VrpAssistantButton() {
  const { isOpen, isProcessing, togglePane } = useVrpAssistant()

  return (
    <Button
      type="button"
      onClick={togglePane}
      aria-label="VRP Assistant"
      className={cn(
        "fixed top-4 right-4 z-50 h-10 w-10 p-0 rounded-full shadow-lg transition-all duration-200",
        "hover:shadow-xl hover:scale-105",
        isOpen && "bg-primary text-primary-foreground"
      )}
      variant={isOpen ? "default" : "outline"}
    >
      {isProcessing ? (
        <Loader2 
          className="h-5 w-5 animate-spin" 
          data-testid="loading-spinner"
        />
      ) : (
        <Bot 
          className="h-5 w-5" 
          data-testid="bot-icon"
        />
      )}
    </Button>
  )
}