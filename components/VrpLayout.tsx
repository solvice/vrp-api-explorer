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
  bottomPanel?: ReactNode
  leftPanelSize?: number
}

export function VrpLayout({
  leftPanel,
  centerPanel,
  bottomPanel,
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
          <TabsList className={`grid w-full ${bottomPanel ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="editor" className="text-sm">
              JSON Editor
            </TabsTrigger>
            <TabsTrigger value="map" className="text-sm">
              Map
            </TabsTrigger>
            {bottomPanel && (
              <TabsTrigger value="timeline" className="text-sm">
                Timeline
              </TabsTrigger>
            )}
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

          {bottomPanel && (
            <TabsContent value="timeline" className="flex-1 mt-0 border-0 p-0">
              <div className="h-full">
                {bottomPanel}
              </div>
            </TabsContent>
          )}
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
          {bottomPanel ? (
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel defaultSize={60} minSize={30}>
                <div className="h-full">
                  {centerPanel}
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={40} minSize={20}>
                <div className="h-full border-t">
                  {bottomPanel}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="h-full">
              {centerPanel}
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}