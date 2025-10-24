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
 * Auto-switches between standard and optimized map based on job count.
 * - <1000 jobs: VrpMap (full features)
 * - ≥1000 jobs: VrpMapOptimized (GPU-rendered, better performance)
 */
export function VrpMapAdaptive(props: VrpMapAdaptiveProps) {
  const jobs = props.requestData.jobs as Array<unknown> | undefined
  const jobCount = jobs?.length || 0

  if (jobCount >= 1000) {
    return <VrpMapOptimized {...props} />
  }

  return <VrpMap {...props} />
}
