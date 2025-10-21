'use client'

import { useState } from 'react'
import { Zap, ZapOff, Info, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { PerformanceMode, PerformanceRecommendations } from '@/lib/hooks/usePerformanceMode'

interface PerformanceModeToggleProps {
  mode: PerformanceMode
  onModeChange: (mode: PerformanceMode) => void
  recommendations: PerformanceRecommendations
  metrics: {
    totalJobs: number
    totalVehicles: number
  }
  className?: string
}

export function PerformanceModeToggle({
  mode,
  onModeChange,
  recommendations,
  metrics,
  className
}: PerformanceModeToggleProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getPerformanceLevelColor = (level: string) => {
    switch (level) {
      case 'good':
        return 'text-green-600'
      case 'moderate':
        return 'text-yellow-600'
      case 'poor':
        return 'text-orange-600'
      case 'critical':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getPerformanceLevelIcon = () => {
    if (mode === 'high-performance') {
      return <Zap className="h-4 w-4 text-green-600" />
    }
    return <ZapOff className="h-4 w-4 text-gray-400" />
  }

  const getModeLabel = () => {
    switch (mode) {
      case 'high-performance':
        return 'High Performance'
      case 'standard':
        return 'Standard'
      case 'auto':
        return 'Auto'
      default:
        return mode
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 px-3 gap-2",
                  recommendations.performanceLevel === 'critical' && "border-red-500 bg-red-50",
                  recommendations.performanceLevel === 'poor' && "border-orange-500 bg-orange-50"
                )}
              >
                {getPerformanceLevelIcon()}
                <span className="text-xs font-medium">{getModeLabel()}</span>
                {recommendations.warnings.length > 0 && (
                  <Info className="h-3 w-3 text-orange-500" />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Performance Mode Settings</p>
          </TooltipContent>
        </Tooltip>

        <PopoverContent className="w-96 p-4" align="end">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <Settings2 className="h-5 w-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">Performance Mode</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Optimize rendering for large datasets
                </p>
              </div>
            </div>

            {/* Dataset Info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Jobs:</span>
                <span className="font-medium">{metrics.totalJobs.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Vehicles:</span>
                <span className="font-medium">{metrics.totalVehicles.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Est. DOM Nodes:</span>
                <span className="font-medium">
                  {recommendations.estimatedDOMNodes.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Performance Level:</span>
                <span className={cn("font-medium capitalize", getPerformanceLevelColor(recommendations.performanceLevel))}>
                  {recommendations.performanceLevel}
                </span>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Rendering Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={mode === 'standard' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    onModeChange('standard')
                    setIsOpen(false)
                  }}
                  className="text-xs h-8"
                >
                  Standard
                </Button>
                <Button
                  variant={mode === 'auto' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    onModeChange('auto')
                    setIsOpen(false)
                  }}
                  className="text-xs h-8"
                >
                  Auto
                </Button>
                <Button
                  variant={mode === 'high-performance' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    onModeChange('high-performance')
                    setIsOpen(false)
                  }}
                  className="text-xs h-8"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  High Perf
                </Button>
              </div>
            </div>

            {/* Active Optimizations */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Active Optimizations</label>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Map Symbols:</span>
                  <span className={recommendations.useOptimizedMap ? "text-green-600 font-medium" : "text-gray-400"}>
                    {recommendations.useOptimizedMap ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Gantt Virtualization:</span>
                  <span className={recommendations.useOptimizedGantt ? "text-green-600 font-medium" : "text-gray-400"}>
                    {recommendations.useOptimizedGantt ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Marker Clustering:</span>
                  <span className={recommendations.useClustering ? "text-green-600 font-medium" : "text-gray-400"}>
                    {recommendations.useClustering ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Drag & Drop:</span>
                  <span className={recommendations.enableDragDrop ? "text-green-600 font-medium" : "text-gray-400"}>
                    {recommendations.enableDragDrop ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {recommendations.warnings.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    {recommendations.warnings.map((warning, idx) => (
                      <p key={idx} className="text-xs text-orange-800">
                        {warning}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Mode Descriptions */}
            <div className="border-t pt-3 space-y-2">
              <div className="text-xs space-y-1">
                <p className="font-medium text-gray-700">Mode Descriptions:</p>
                <ul className="space-y-1 text-gray-600 ml-3">
                  <li>• <strong>Standard:</strong> Traditional DOM-based rendering</li>
                  <li>• <strong>Auto:</strong> Switches based on dataset size</li>
                  <li>• <strong>High Performance:</strong> Symbol layers & virtualization</li>
                </ul>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
