# Performance Optimization Integration Example

This guide shows how to integrate the performance optimizations into your VRP Explorer application.

## Step 1: Update VrpExplorer Component

```typescript
// components/VrpExplorer.tsx
'use client'

import { useState } from 'react'
import { VrpMapAdaptive } from '@/components/VrpMapAdaptive'
import { VrpGanttAdaptive } from '@/components/VrpGanttAdaptive'
import { VrpJsonEditor } from '@/components/VrpJsonEditor'
import { PerformanceModeToggle } from '@/components/PerformanceModeToggle'
import { usePerformanceMode, PerformanceMode } from '@/lib/hooks/usePerformanceMode'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable-panels'

export function VrpExplorer() {
  const [requestData, setRequestData] = useState<Record<string, unknown>>({})
  const [responseData, setResponseData] = useState<Vrp.OnRouteResponse | null>(null)
  const [highlightedJob, setHighlightedJob] = useState<{ resource: string; job: string } | null>(null)
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('auto')

  // Use performance hook to get optimization recommendations
  const {
    recommendations,
    metrics,
    shouldUseOptimizedMap,
    shouldUseOptimizedGantt,
    shouldUseClustering,
    shouldEnableDragDrop
  } = usePerformanceMode(responseData, requestData, performanceMode)

  // Show warnings to user if performance is poor
  useEffect(() => {
    if (recommendations.performanceLevel === 'critical') {
      toast.error('Large dataset detected! Switch to High-Performance mode for better performance.')
    } else if (recommendations.warnings.length > 0) {
      recommendations.warnings.forEach(warning => {
        toast.warning(warning)
      })
    }
  }, [recommendations])

  return (
    <div className="h-screen flex flex-col">
      {/* Header with performance toggle */}
      <header className="border-b p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">VRP API Explorer</h1>

        <div className="flex items-center gap-4">
          {/* Performance metrics display */}
          <div className="text-sm text-muted-foreground">
            {metrics.totalJobs > 0 && (
              <span>
                {metrics.totalJobs.toLocaleString()} jobs, {metrics.totalVehicles} vehicles
              </span>
            )}
          </div>

          {/* Performance mode toggle */}
          <PerformanceModeToggle
            mode={performanceMode}
            onModeChange={setPerformanceMode}
            recommendations={recommendations}
            metrics={metrics}
          />
        </div>
      </header>

      {/* Main content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left panel - JSON Editor */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <VrpJsonEditor
            requestData={requestData}
            responseData={responseData}
            onRequestChange={setRequestData}
            onSolve={handleSolve}
          />
        </ResizablePanel>

        <ResizableHandle />

        {/* Right panel - Visualization */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <ResizablePanelGroup direction="vertical">
            {/* Map panel */}
            <ResizablePanel defaultSize={60} minSize={40}>
              <VrpMapAdaptive
                useOptimized={shouldUseOptimizedMap}
                useClustering={shouldUseClustering}
                requestData={requestData}
                responseData={responseData}
                highlightedJob={highlightedJob}
                onJobHover={setHighlightedJob}
              />
            </ResizablePanel>

            <ResizableHandle />

            {/* Gantt panel */}
            <ResizablePanel defaultSize={40} minSize={30}>
              <VrpGanttAdaptive
                useOptimized={shouldUseOptimizedGantt}
                enableDragDrop={shouldEnableDragDrop}
                requestData={requestData}
                responseData={responseData}
                highlightedJob={highlightedJob}
                onJobHover={setHighlightedJob}
                onJobReorder={handleJobReorder}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
```

## Step 2: Add Test Data Generation

```typescript
// Add to your VrpJsonEditor or create a separate TestDataPanel component

import { createTestScenario, TEST_SCENARIOS } from '@/lib/test-data-generator'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TestTube } from 'lucide-react'

export function TestDataGenerator({ onDataGenerated }: {
  onDataGenerated: (data: { requestData: any; responseData: any }) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <TestTube className="h-4 w-4 mr-2" />
          Generate Test Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {Object.entries(TEST_SCENARIOS).map(([key, scenario]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => {
              const data = createTestScenario(key as keyof typeof TEST_SCENARIOS)
              onDataGenerated(data)
            }}
          >
            {scenario.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## Step 3: Performance Monitoring Panel (Optional)

```typescript
// components/PerformanceMonitor.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { estimatePerformanceImpact } from '@/lib/hooks/usePerformanceMode'

export function PerformanceMonitor({ jobCount, vehicleCount }: {
  jobCount: number
  vehicleCount: number
}) {
  const [metrics, setMetrics] = useState<any>(null)

  useEffect(() => {
    if (jobCount > 0) {
      const impact = estimatePerformanceImpact(jobCount, vehicleCount)
      setMetrics(impact)
    }
  }, [jobCount, vehicleCount])

  if (!metrics || jobCount === 0) return null

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm">Performance Impact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">DOM Nodes:</span>
          <span className="font-medium">{metrics.totalDOMNodes.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Event Listeners:</span>
          <span className="font-medium">{metrics.totalEventListeners.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Est. Memory:</span>
          <span className="font-medium">{metrics.estimatedMemoryMB.toFixed(1)} MB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Render Time:</span>
          <span className="font-medium">{metrics.renderTimeEstimate}</span>
        </div>
        <div className="pt-2 border-t">
          <p className={`text-xs ${
            metrics.recommendation.includes('required') ? 'text-red-600' :
            metrics.recommendation.includes('recommended') ? 'text-orange-600' :
            'text-green-600'
          }`}>
            {metrics.recommendation}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Step 4: Add Keyboard Shortcuts

```typescript
// Add to VrpExplorer component

useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Toggle performance mode with Ctrl/Cmd + P
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault()
      setPerformanceMode(prev => {
        if (prev === 'standard') return 'auto'
        if (prev === 'auto') return 'high-performance'
        return 'standard'
      })
      toast.info(`Performance mode: ${performanceMode}`)
    }

    // Generate test data with Ctrl/Cmd + T
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault()
      const data = createTestScenario('large')
      setRequestData(data.requestData)
      setResponseData(data.responseData)
      toast.success('Test data generated')
    }
  }

  window.addEventListener('keydown', handleKeyPress)
  return () => window.removeEventListener('keydown', handleKeyPress)
}, [performanceMode])
```

## Step 5: Add Loading States

```typescript
// Enhanced loading state for large datasets

const [isProcessing, setIsProcessing] = useState(false)

const handleSolve = async () => {
  setIsProcessing(true)

  try {
    // Show different messages based on dataset size
    if (metrics.totalJobs > 10000) {
      toast.info('Processing large dataset... This may take a moment.')
    }

    const result = await solveVrp(requestData)
    setResponseData(result)

    if (metrics.totalJobs > 10000) {
      toast.success(`Solved ${metrics.totalJobs} jobs in ${metrics.totalVehicles} vehicles`)
    }
  } catch (error) {
    toast.error('Failed to solve VRP')
  } finally {
    setIsProcessing(false)
  }
}
```

## Step 6: Error Boundaries

```typescript
// components/PerformanceErrorBoundary.tsx

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: React.ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class PerformanceErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Performance error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="m-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Performance Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The visualization encountered a performance error, likely due to dataset size.
            </p>
            <p className="text-xs text-muted-foreground">
              Error: {this.state.error?.message}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  this.setState({ hasError: false })
                  this.props.onReset?.()
                }}
              >
                Switch to High-Performance Mode
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Usage
<PerformanceErrorBoundary onReset={() => setPerformanceMode('high-performance')}>
  <VrpExplorer />
</PerformanceErrorBoundary>
```

## Step 7: Testing Checklist

```typescript
// Create a test suite for performance

describe('Performance Optimizations', () => {
  it('should use standard mode for small datasets', () => {
    const { requestData, responseData } = createTestScenario('small')
    const { shouldUseOptimizedMap } = usePerformanceMode(responseData, requestData, 'auto')
    expect(shouldUseOptimizedMap).toBe(false)
  })

  it('should use optimized mode for large datasets', () => {
    const { requestData, responseData } = createTestScenario('extreme')
    const { shouldUseOptimizedMap } = usePerformanceMode(responseData, requestData, 'auto')
    expect(shouldUseOptimizedMap).toBe(true)
  })

  it('should generate correct performance warnings', () => {
    const { requestData, responseData } = createTestScenario('veryLarge')
    const { recommendations } = usePerformanceMode(responseData, requestData, 'standard')
    expect(recommendations.warnings.length).toBeGreaterThan(0)
  })

  it('should estimate DOM nodes correctly', () => {
    const impact = estimatePerformanceImpact(20000, 200)
    expect(impact.totalDOMNodes).toBe(100000) // 20k jobs * 5 nodes each
  })
})
```

## Summary

After integration, you'll have:

✅ **Automatic performance optimization** based on dataset size
✅ **Manual performance mode toggle** for user control
✅ **Real-time performance warnings** and recommendations
✅ **Test data generation** for all scenarios
✅ **Performance monitoring** dashboard
✅ **Error boundaries** for graceful degradation
✅ **Keyboard shortcuts** for quick testing

The application will now smoothly handle datasets from 100 to 20,000+ jobs with optimal performance for each size range.
