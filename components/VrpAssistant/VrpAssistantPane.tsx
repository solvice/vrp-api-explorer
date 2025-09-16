'use client'

import { ShadcnChatInterface } from './ShadcnChatInterface'

export function VrpAssistantPane() {
  return (
    <div
      data-testid="vrp-assistant-pane"
      className="h-full bg-background border-t shadow-lg"
      role="complementary"
      aria-label="VRP AI Assistant Panel"
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h2 className="text-sm font-semibold text-foreground">VRP AI Assistant</h2>
          </div>
          <div className="text-xs text-muted-foreground">
            Powered by OpenAI
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 min-h-0">
          <ShadcnChatInterface />
        </div>
      </div>
    </div>
  )
}