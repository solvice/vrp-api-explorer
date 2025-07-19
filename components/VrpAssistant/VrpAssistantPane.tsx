'use client'

import { useVrpAssistant } from './VrpAssistantContext'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

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
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-muted-foreground">VRP Assistant Chat</p>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}