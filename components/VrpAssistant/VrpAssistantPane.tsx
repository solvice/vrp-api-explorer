'use client'

import { useVrpAssistant } from './VrpAssistantContext'
import { ChatInterface } from './ChatInterface'

export function VrpAssistantPane() {
  const { isOpen } = useVrpAssistant()

  if (!isOpen) {
    return null
  }

  return (
    <div 
      data-testid="vrp-assistant-pane"
      className="h-full bg-background border-t"
    >
      <ChatInterface />
    </div>
  )
}