'use client'

import { useMemo, useState } from 'react'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { VrpKpiSheet } from './VrpKpiSheet'
import {
  CheckCircle2,
  XCircle,
  Users,
  MapPin,
  Route,
  Clock,
  TrendingUp,
  AlertTriangle,
  ChevronRight
} from 'lucide-react'

interface VrpKpiBarProps {
  responseData: Vrp.OnRouteResponse | null
  requestData: Record<string, unknown>
}

export function VrpKpiBar({ responseData, requestData }: VrpKpiBarProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Calculate KPIs using useMemo
  const kpis = useMemo(() => {
    if (!responseData) return null

    const score = responseData.score
    const trips = responseData.trips || []
    const unserved = responseData.unserved || []

    // Count active resources (resources with at least one visit)
    const activeResources = new Set(trips.filter(t => t.visits && t.visits.length > 0).map(t => t.resource)).size

    // Count total jobs from request
    const jobs = requestData.jobs as Array<Record<string, unknown>> | undefined
    const totalJobs = jobs?.length || 0
    const jobsServed = totalJobs - unserved.length

    // Distance (convert meters to km)
    const totalDistanceKm = responseData.totalTravelDistanceInMeters
      ? (responseData.totalTravelDistanceInMeters / 1000).toFixed(1)
      : '0.0'

    // Time metrics (convert seconds to human readable)
    const travelTime = formatDuration(responseData.totalTravelTimeInSeconds || 0)

    // Occupancy percentage
    const occupancy = responseData.occupancy ? (responseData.occupancy * 100).toFixed(1) : '0.0'

    return {
      feasible: score?.feasible ?? false,
      activeResources,
      totalJobs,
      jobsServed,
      unservedCount: unserved.length,
      totalDistanceKm,
      travelTime,
      occupancy
    }
  }, [responseData, requestData])

  if (!kpis) return null

  return (
    <>
      <div className="h-14 bg-muted/30 border-y flex items-center px-4 gap-3">
        {/* Feasibility Badge */}
        <Badge
          variant={kpis.feasible ? "default" : "destructive"}
          className="gap-1 h-7"
        >
          {kpis.feasible ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              <span className="text-xs">Feasible</span>
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3" />
              <span className="text-xs">Infeasible</span>
            </>
          )}
        </Badge>

        <Separator orientation="vertical" className="h-6" />

        {/* Active Resources */}
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{kpis.activeResources}</span>
          <span className="text-xs text-muted-foreground">vehicles</span>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Jobs Served */}
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{kpis.jobsServed}/{kpis.totalJobs}</span>
          <span className="text-xs text-muted-foreground">jobs</span>
        </div>

        {/* Unserved Jobs Warning */}
        {kpis.unservedCount > 0 && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-100 dark:bg-orange-950 rounded">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                {kpis.unservedCount} unserved
              </span>
            </div>
          </>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* Total Distance */}
        <div className="flex items-center gap-1.5">
          <Route className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{kpis.totalDistanceKm} km</span>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Travel Time */}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{kpis.travelTime}</span>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Occupancy */}
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{kpis.occupancy}%</span>
          <span className="text-xs text-muted-foreground">occupancy</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Details Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => setIsSheetOpen(true)}
          aria-label="View detailed metrics"
        >
          Details
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Detailed Metrics Sheet */}
      <VrpKpiSheet
        responseData={responseData}
        requestData={requestData}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </>
  )
}

// Helper function to format duration in seconds to human readable format
function formatDuration(seconds: number): string {
  if (seconds === 0) return '0m'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h`
  } else {
    return `${minutes}m`
  }
}