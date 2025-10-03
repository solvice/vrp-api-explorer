'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Pencil, BarChart3, FileJson } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatMode } from './VrpAssistantContext'

interface ChatModeSelectorProps {
  value: ChatMode
  onChange: (mode: ChatMode) => void
  disabled?: boolean
}

const modeConfig = {
  modify: {
    label: 'Modify',
    icon: Pencil,
    description: 'Natural language VRP data modifications',
  },
  analyze: {
    label: 'Analyze',
    icon: BarChart3,
    description: 'Analyze current VRP request/response data',
  },
  convert: {
    label: 'Convert',
    icon: FileJson,
    description: 'CSV/data conversion using Code Interpreter',
  },
} as const

export function ChatModeSelector({ value, onChange, disabled }: ChatModeSelectorProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex gap-1.5" role="group" aria-label="Chat mode selector">
        {(Object.keys(modeConfig) as ChatMode[]).map((mode) => {
          const config = modeConfig[mode]
          const Icon = config.icon
          const isActive = value === mode

          return (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(mode)}
                  disabled={disabled}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                  aria-label={`${config.label} mode: ${config.description}`}
                  aria-pressed={isActive}
                >
                  <Icon className="h-3 w-3" />
                  <span>{config.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                <p className="text-xs">{config.description}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
