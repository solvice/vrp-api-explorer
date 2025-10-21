import { useState, useEffect, useMemo } from 'react'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

export interface PerformanceConfig {
  // Thresholds for automatic mode switching
  mapMarkerThreshold: number      // Switch to symbol-based rendering above this many jobs
  ganttRowThreshold: number        // Switch to virtualized gantt above this many vehicles
  ganttJobThreshold: number        // Switch to virtualized gantt above this many jobs
  clusteringEnabled: boolean       // Enable marker clustering
  enableDragDrop: boolean          // Enable drag-and-drop (expensive with many jobs)
  maxMarkersForDOM: number         // Maximum markers to render as DOM elements
}

export type PerformanceMode = 'auto' | 'high-performance' | 'standard'

const DEFAULT_CONFIG: PerformanceConfig = {
  mapMarkerThreshold: 500,
  ganttRowThreshold: 100,
  ganttJobThreshold: 1000,
  clusteringEnabled: true,
  enableDragDrop: true,
  maxMarkersForDOM: 1000
}

const HIGH_PERFORMANCE_CONFIG: PerformanceConfig = {
  mapMarkerThreshold: 0, // Always use symbol-based rendering
  ganttRowThreshold: 0,  // Always use virtualization
  ganttJobThreshold: 0,
  clusteringEnabled: true,
  enableDragDrop: false, // Disable expensive features
  maxMarkersForDOM: 0
}

const STANDARD_CONFIG: PerformanceConfig = {
  mapMarkerThreshold: Infinity, // Never switch automatically
  ganttRowThreshold: Infinity,
  ganttJobThreshold: Infinity,
  clusteringEnabled: false,
  enableDragDrop: true,
  maxMarkersForDOM: Infinity
}

interface DatasetMetrics {
  totalJobs: number
  totalVehicles: number
  totalTrips: number
  largestTripSize: number
}

export interface PerformanceRecommendations {
  useOptimizedMap: boolean
  useOptimizedGantt: boolean
  useClustering: boolean
  enableDragDrop: boolean
  estimatedDOMNodes: number
  performanceLevel: 'good' | 'moderate' | 'poor' | 'critical'
  warnings: string[]
}

/**
 * Hook to manage performance mode and automatically switch implementations
 * based on dataset size
 */
export function usePerformanceMode(
  responseData?: Vrp.OnRouteResponse | null,
  requestData?: Record<string, unknown>,
  mode: PerformanceMode = 'auto'
) {
  const [manualMode, setManualMode] = useState<PerformanceMode>(mode)
  const [config, setConfig] = useState<PerformanceConfig>(DEFAULT_CONFIG)

  // Calculate dataset metrics
  const metrics = useMemo((): DatasetMetrics => {
    const jobs = (requestData?.jobs as Array<Record<string, unknown>>) || []
    const trips = responseData?.trips || []

    let totalJobs = jobs.length
    let totalVehicles = trips.length
    let totalTrips = trips.length
    let largestTripSize = 0

    trips.forEach(trip => {
      const visitCount = trip.visits?.length || 0
      largestTripSize = Math.max(largestTripSize, visitCount)
    })

    return {
      totalJobs,
      totalVehicles,
      totalTrips,
      largestTripSize
    }
  }, [responseData, requestData])

  // Update config based on selected mode
  useEffect(() => {
    switch (manualMode) {
      case 'high-performance':
        setConfig(HIGH_PERFORMANCE_CONFIG)
        break
      case 'standard':
        setConfig(STANDARD_CONFIG)
        break
      case 'auto':
      default:
        setConfig(DEFAULT_CONFIG)
        break
    }
  }, [manualMode])

  // Calculate performance recommendations
  const recommendations = useMemo((): PerformanceRecommendations => {
    const { totalJobs, totalVehicles } = metrics

    // Determine if we should use optimized implementations
    const useOptimizedMap = manualMode === 'auto'
      ? totalJobs > config.mapMarkerThreshold
      : manualMode === 'high-performance'

    const useOptimizedGantt = manualMode === 'auto'
      ? (totalVehicles > config.ganttRowThreshold || totalJobs > config.ganttJobThreshold)
      : manualMode === 'high-performance'

    const useClustering = config.clusteringEnabled && (useOptimizedMap || totalJobs > 100)

    const enableDragDrop = config.enableDragDrop && totalJobs < 5000

    // Estimate DOM nodes for standard implementation
    const estimatedMapNodes = totalJobs * 2 // Marker + tooltip
    const estimatedGanttNodes = totalJobs * 3 // Activity block + tooltip + drag wrapper
    const estimatedDOMNodes = estimatedMapNodes + estimatedGanttNodes

    // Determine performance level
    let performanceLevel: 'good' | 'moderate' | 'poor' | 'critical' = 'good'
    if (estimatedDOMNodes > 50000) performanceLevel = 'critical'
    else if (estimatedDOMNodes > 20000) performanceLevel = 'poor'
    else if (estimatedDOMNodes > 10000) performanceLevel = 'moderate'

    // Generate warnings
    const warnings: string[] = []
    if (totalJobs > 10000 && !useOptimizedMap) {
      warnings.push('Map: Consider enabling high-performance mode for better rendering performance')
    }
    if (totalJobs > 5000 && !useOptimizedGantt) {
      warnings.push('Gantt: Large dataset detected. Virtualization recommended.')
    }
    if (totalJobs > 20000) {
      warnings.push('Very large dataset (20k+ jobs). High-performance mode strongly recommended.')
    }
    if (estimatedDOMNodes > 50000 && manualMode === 'standard') {
      warnings.push(`Critical: ${Math.round(estimatedDOMNodes / 1000)}k DOM nodes will cause severe lag. Switch to high-performance mode.`)
    }

    return {
      useOptimizedMap,
      useOptimizedGantt,
      useClustering,
      enableDragDrop,
      estimatedDOMNodes,
      performanceLevel,
      warnings
    }
  }, [metrics, config, manualMode])

  // Auto-switch to high-performance mode if dataset is too large
  useEffect(() => {
    if (manualMode === 'auto' && metrics.totalJobs > 20000) {
      console.warn('🚀 Auto-switching to high-performance mode due to large dataset (20k+ jobs)')
    }
  }, [metrics, manualMode])

  return {
    mode: manualMode,
    setMode: setManualMode,
    config,
    metrics,
    recommendations,
    // Helper flags for conditional rendering
    shouldUseOptimizedMap: recommendations.useOptimizedMap,
    shouldUseOptimizedGantt: recommendations.useOptimizedGantt,
    shouldUseClustering: recommendations.useClustering,
    shouldEnableDragDrop: recommendations.enableDragDrop
  }
}

/**
 * Utility to estimate performance impact
 */
export function estimatePerformanceImpact(jobCount: number, vehicleCount: number) {
  const mapDOMNodes = jobCount * 2 // DOM markers
  const ganttDOMNodes = jobCount * 3 // Activity blocks
  const totalDOMNodes = mapDOMNodes + ganttDOMNodes

  const mapEventListeners = jobCount * 2 // mouseenter + mouseleave
  const ganttEventListeners = jobCount * 2
  const totalEventListeners = mapEventListeners + ganttEventListeners

  const estimatedMemoryMB = (totalDOMNodes * 0.5) / 1000 // Rough estimate: 0.5KB per node

  return {
    totalDOMNodes,
    totalEventListeners,
    estimatedMemoryMB,
    renderTimeEstimate: totalDOMNodes > 50000 ? 'Several seconds' :
                        totalDOMNodes > 20000 ? '1-2 seconds' :
                        totalDOMNodes > 10000 ? '500ms-1s' : 'Fast (<500ms)',
    recommendation: totalDOMNodes > 20000 ? 'High-performance mode required' :
                    totalDOMNodes > 10000 ? 'High-performance mode recommended' :
                    'Standard mode acceptable'
  }
}
