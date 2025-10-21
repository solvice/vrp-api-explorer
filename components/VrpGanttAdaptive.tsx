'use client'

import { VrpGantt, JobReorderEvent } from './VrpGantt'
import { VrpGanttVirtualized } from './VrpGanttVirtualized'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

interface VrpGanttAdaptiveProps {
  requestData: Record<string, unknown>
  responseData?: Vrp.OnRouteResponse | null
  className?: string
  highlightedJob?: { resource: string; job: string } | null
  onJobHover?: (job: { resource: string; job: string } | null) => void
  onJobReorder?: (event: JobReorderEvent) => void
  isReordering?: boolean
  useOptimized: boolean // Controlled by parent via performance hook
  enableDragDrop?: boolean
}

/**
 * Adaptive wrapper that automatically chooses between standard and virtualized Gantt implementations
 *
 * - Standard: Full-featured with drag-and-drop, tooltips, and all interactions (< 1000 jobs)
 * - Virtualized: High-performance windowed rendering for large datasets (1000+ jobs)
 */
export function VrpGanttAdaptive(props: VrpGanttAdaptiveProps) {
  const { useOptimized, enableDragDrop, ...restProps } = props

  if (useOptimized) {
    // Use virtualized version for large datasets
    return <VrpGanttVirtualized {...restProps} />
  }

  // Use standard version with all features
  return (
    <VrpGantt
      {...restProps}
      onJobReorder={enableDragDrop ? props.onJobReorder : undefined}
      isReordering={enableDragDrop ? props.isReordering : false}
    />
  )
}
