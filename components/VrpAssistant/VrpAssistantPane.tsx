'use client'

import { ShadcnChatInterface } from './ShadcnChatInterface'

export function VrpAssistantPane() {
  return (
    <div
      data-testid="vrp-assistant-pane"
      className="h-full flex flex-col"
    >
      <ShadcnChatInterface />
    </div>
  )
}