'use client'

import { VrpMap } from './VrpMap'
import { VrpMapOptimized } from './VrpMapOptimized'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

interface VrpMapAdaptiveProps {
  requestData: Record<string, unknown>
  responseData?: Vrp.OnRouteResponse | null
  className?: string
  highlightedJob?: { resource: string; job: string } | null
  onJobHover?: (job: { resource: string; job: string } | null) => void
}

/**
 * Automatically chooses between VrpMap and VrpMapOptimized based on job count.
 *
 * - < 1000 jobs: Uses standard VrpMap (full features)
 * - >= 1000 jobs: Uses VrpMapOptimized (better performance, fewer features)
 */
export function VrpMapAdaptive(props: VrpMapAdaptiveProps) {
  const jobs = props.requestData.jobs as Array<unknown> | undefined
  const jobCount = jobs?.length || 0

  // Use optimized version for large datasets
  if (jobCount >= 1000) {
    return <VrpMapOptimized {...props} />
  }

  // Use standard version for normal datasets (has all features)
  return <VrpMap {...props} />
}
