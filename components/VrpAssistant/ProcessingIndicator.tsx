'use client'

import React from 'react'
import { Loader2, Brain, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProcessingState = 'idle' | 'thinking' | 'processing' | 'validating' | 'error' | 'success'

export interface ProcessingIndicatorProps {
  state: ProcessingState
  message?: string
  progress?: number // 0-100
  className?: string
}

const stateConfig = {
  idle: {
    icon: null,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    message: ''
  },
  thinking: {
    icon: Brain,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    message: 'Thinking about your request...'
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    message: 'Processing with AI...'
  },
  validating: {
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    message: 'Validating changes...'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    message: 'Something went wrong'
  },
  success: {
    icon: null,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    message: 'Complete!'
  }
}

export function ProcessingIndicator({ 
  state, 
  message, 
  progress,
  className 
}: ProcessingIndicatorProps) {
  const config = stateConfig[state]
  const Icon = config.icon
  const displayMessage = message || config.message

  if (state === 'idle') {
    return null
  }

  return (
    <div 
      className={cn(
        'flex items-center space-x-3 p-3 rounded-lg border',
        config.bgColor,
        'border-border/50',
        className
      )}
      data-testid="processing-indicator"
      role="status"
      aria-live="polite"
      aria-label={`Processing status: ${displayMessage}`}
    >
      {Icon && (
        <Icon 
          className={cn(
            'h-4 w-4',
            config.color,
            state === 'processing' && 'animate-spin'
          )}
          aria-hidden="true"
        />
      )}
      
      <div className="flex-1 min-w-0">
        <div className={cn('text-sm font-medium', config.color)}>
          {displayMessage}
        </div>
        
        {progress !== undefined && (
          <div className="mt-2">
            <div 
              className="w-full bg-background/50 rounded-full h-1.5"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress: ${Math.round(progress)}%`}
            >
              <div 
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  'bg-current opacity-60'
                )}
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1" aria-hidden="true">
              {Math.round(progress)}%
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Hook for managing processing states with automatic transitions
 */
export function useProcessingState(initialState: ProcessingState = 'idle') {
  const [state, setState] = React.useState<ProcessingState>(initialState)
  const [message, setMessage] = React.useState<string>('')
  const [progress, setProgress] = React.useState<number | undefined>()

  const updateState = React.useCallback((
    newState: ProcessingState, 
    newMessage?: string,
    newProgress?: number
  ) => {
    setState(newState)
    if (newMessage !== undefined) setMessage(newMessage)
    if (newProgress !== undefined) setProgress(newProgress)
  }, [])

  const reset = React.useCallback(() => {
    setState('idle')
    setMessage('')
    setProgress(undefined)
  }, [])

  const startProcessing = React.useCallback((initialMessage?: string) => {
    updateState('thinking', initialMessage || 'Starting...')
    
    // Simulate progression through states
    const timer1 = setTimeout(() => {
      updateState('processing', 'Processing with AI...', 25)
    }, 500)

    const timer2 = setTimeout(() => {
      setProgress(50)
    }, 1500)

    const timer3 = setTimeout(() => {
      updateState('validating', 'Validating changes...', 75)
    }, 2500)

    // Return cleanup function
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [updateState])

  return {
    state,
    message,
    progress,
    updateState,
    reset,
    startProcessing
  }
}