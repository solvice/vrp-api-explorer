'use client'

import { Bot, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useVrpAssistant } from './VrpAssistantContext'
import { cn } from '@/lib/utils'

interface VrpAssistantButtonProps {
  compact?: boolean
  prominent?: boolean
}

export function VrpAssistantButton({ compact = false, prominent = false }: VrpAssistantButtonProps) {
  const { isOpen, isProcessing, togglePane } = useVrpAssistant()

  if (prominent) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={togglePane}
            data-testid="vrp-assistant-button"
            aria-label={isOpen ? "Close VRP AI Assistant" : "Open VRP AI Assistant"}
            aria-expanded={isOpen}
            aria-describedby="vrp-assistant-description"
            className={cn(
              "h-10 w-10 p-0 transition-all duration-200 shadow-md",
              "hover:scale-105 hover:shadow-lg focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0",
              "hover:from-blue-600 hover:to-purple-700",
              isOpen && "from-purple-600 to-blue-500 shadow-lg"
            )}
            variant="default"
            disabled={isProcessing}
            size="default"
          >
            {isProcessing ? (
              <Loader2 
                className="h-5 w-5 animate-spin" 
                data-testid="loading-spinner"
                aria-hidden="true"
              />
            ) : (
              <Bot 
                className="h-5 w-5" 
                data-testid="bot-icon"
                aria-hidden="true"
              />
            )}
            <span className="sr-only" id="vrp-assistant-description">
              AI assistant for modifying VRP requests using natural language
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{isOpen ? "Close AI Assistant" : "Modify VRP data with natural language"}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={togglePane}
            data-testid="vrp-assistant-button"
            aria-label={isOpen ? "Close VRP AI Assistant" : "Open VRP AI Assistant"}
            aria-expanded={isOpen}
            aria-describedby="vrp-assistant-description"
            className={cn(
              "h-7 w-7 p-0 transition-all duration-200",
              "hover:scale-105 focus:ring-2 focus:ring-primary focus:ring-offset-2",
              isOpen && "bg-primary text-primary-foreground"
            )}
            variant={isOpen ? "default" : "ghost"}
            disabled={isProcessing}
            size="sm"
          >
            {isProcessing ? (
              <Loader2 
                className="h-4 w-4 animate-spin" 
                data-testid="loading-spinner"
                aria-hidden="true"
              />
            ) : (
              <Bot 
                className="h-4 w-4" 
                data-testid="bot-icon"
                aria-hidden="true"
              />
            )}
            <span className="sr-only" id="vrp-assistant-description">
              AI assistant for modifying VRP requests using natural language
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isOpen ? "Close AI Assistant" : "Open AI Assistant"}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Button
      type="button"
      onClick={togglePane}
      data-testid="vrp-assistant-button"
      aria-label={isOpen ? "Close VRP AI Assistant" : "Open VRP AI Assistant"}
      aria-expanded={isOpen}
      aria-describedby="vrp-assistant-description"
      className={cn(
        "fixed top-4 right-4 z-50 h-10 w-10 p-0 rounded-full shadow-lg transition-all duration-200",
        "hover:shadow-xl hover:scale-105 focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isOpen && "bg-primary text-primary-foreground"
      )}
      variant={isOpen ? "default" : "outline"}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <Loader2 
          className="h-5 w-5 animate-spin" 
          data-testid="loading-spinner"
          aria-hidden="true"
        />
      ) : (
        <Bot 
          className="h-5 w-5" 
          data-testid="bot-icon"
          aria-hidden="true"
        />
      )}
      <span className="sr-only" id="vrp-assistant-description">
        AI assistant for modifying VRP requests using natural language
      </span>
    </Button>
  )
}