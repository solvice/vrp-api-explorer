'use client'

import { useState, useEffect, ReactNode } from 'react'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface VrpLayoutProps {
  leftPanel: ReactNode
  centerPanel: ReactNode
  leftPanelSize?: number
}

export function VrpLayout({
  leftPanel,
  centerPanel,
  leftPanelSize = 50
}: VrpLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)
  const centerPanelSize = 100 - leftPanelSize

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches)
    }

    // Check on mount
    checkIsMobile()

    // Listen for viewport changes
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    mediaQuery.addEventListener('change', checkIsMobile)

    return () => {
      mediaQuery.removeEventListener('change', checkIsMobile)
    }
  }, [])

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <Tabs defaultValue="editor" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="editor" className="text-sm">
              JSON Editor
            </TabsTrigger>
            <TabsTrigger value="map" className="text-sm">
              Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 mt-0 border-0 p-0">
            <div className="h-full">
              {leftPanel}
            </div>
          </TabsContent>

          <TabsContent value="map" className="flex-1 mt-0 border-0 p-0">
            <div className="h-full">
              {centerPanel}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1"
      >
        <ResizablePanel
          defaultSize={leftPanelSize}
          minSize={30}
          maxSize={70}
        >
          <div className="h-full border-r">
            {leftPanel}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          defaultSize={centerPanelSize}
          minSize={30}
          maxSize={70}
        >
          <div className="h-full">
            {centerPanel}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}