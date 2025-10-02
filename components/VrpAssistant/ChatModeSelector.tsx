'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    color: 'bg-blue-500',
  },
  analyze: {
    label: 'Analyze',
    icon: BarChart3,
    description: 'Analyze current VRP request/response data',
    color: 'bg-purple-500',
  },
  convert: {
    label: 'Convert',
    icon: FileJson,
    description: 'CSV/data conversion using Code Interpreter',
    color: 'bg-emerald-500',
  },
} as const

export function ChatModeSelector({ value, onChange, disabled }: ChatModeSelectorProps) {
  return (
    <div className="space-y-2" role="group" aria-label="Chat mode selector">
      <TooltipProvider delayDuration={300}>
        <Tabs value={value} onValueChange={(v) => onChange(v as ChatMode)}>
          <TabsList className="w-full grid grid-cols-3" aria-label="Chat modes">
            {(Object.keys(modeConfig) as ChatMode[]).map((mode) => {
              const config = modeConfig[mode]
              const Icon = config.icon
              const isActive = value === mode

              return (
                <Tooltip key={mode}>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={mode}
                      disabled={disabled}
                      className="relative gap-1.5"
                      aria-label={`${config.label} mode: ${config.description}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{config.label}</span>
                      {isActive && (
                        <span className={cn("absolute -top-1 -right-1 w-2 h-2 rounded-full", config.color)} />
                      )}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{config.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Press Shift+Tab to cycle modes
                    </p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </TabsList>
        </Tabs>
      </TooltipProvider>
    </div>
  )
}
