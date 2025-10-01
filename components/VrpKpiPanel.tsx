'use client'

import { useMemo, useState } from 'react'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { JobExplanationResponse } from 'solvice-vrp-solver/resources/vrp/jobs'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Route,
  MapPin,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Users,
  Truck,
  Target,
  Info,
  AlertCircle
} from 'lucide-react'

interface VrpKpiPanelProps {
  responseData: Vrp.OnRouteResponse
  requestData: Record<string, unknown>
  explanation: JobExplanationResponse | null
  className?: string
}

export function VrpKpiPanel({ responseData, requestData, explanation, className }: VrpKpiPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Calculate KPIs using useMemo
  const kpis = useMemo(() => {
    const score = responseData.score
    const trips = responseData.trips || []
    const unserved = responseData.unserved || []
    const violations = responseData.violations || []

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
    const serviceTime = formatDuration(responseData.totalServiceTimeInSeconds || 0)
    const waitTime = formatDuration(responseData.totalWaitTimeInSeconds || 0)

    // Occupancy percentage
    const occupancy = responseData.occupancy ? (responseData.occupancy * 100).toFixed(1) : '0.0'

    // Workload fairness (0-1 scale, higher is better)
    const workloadFairness = responseData.workloadFairness
      ? (responseData.workloadFairness * 100).toFixed(1)
      : null

    // Constraint violations
    const hardViolations = violations.filter(v => v.level === 'HARD').length
    const softViolations = violations.filter(v => v.level === 'SOFT').length

    return {
      feasible: score?.feasible ?? false,
      activeResources,
      totalJobs,
      jobsServed,
      unservedCount: unserved.length,
      totalDistanceKm,
      travelTime,
      serviceTime,
      waitTime,
      occupancy,
      workloadFairness,
      hardViolations,
      softViolations,
      score
    }
  }, [responseData, requestData])

  return (
    <Card className={cn("w-80 shadow-lg backdrop-blur-sm bg-background/95", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            Solution KPIs
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3 pt-0">
          {/* Feasibility Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Feasibility</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={kpis.feasible ? "default" : "destructive"}
                  className="gap-1"
                >
                  {kpis.feasible ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Feasible
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      Infeasible
                    </>
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {kpis.feasible
                    ? 'Solution satisfies all hard constraints'
                    : 'Solution violates one or more hard constraints'}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator />

          {/* Active Resources */}
          <KpiRow
            icon={<Users className="h-3.5 w-3.5" />}
            label="Active Resources"
            value={kpis.activeResources.toString()}
            tooltip="Number of vehicles/resources used in solution"
          />

          {/* Jobs Served */}
          <KpiRow
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="Jobs Served"
            value={`${kpis.jobsServed} / ${kpis.totalJobs}`}
            tooltip="Number of jobs assigned to resources"
          />

          {/* Unserved Jobs Alert */}
          {kpis.unservedCount > 0 && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-destructive/10 border border-destructive/20 rounded">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
              <span className="text-xs font-medium text-destructive">
                {kpis.unservedCount} unserved job{kpis.unservedCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <Separator />

          {/* Travel Distance */}
          <KpiRow
            icon={<Route className="h-3.5 w-3.5" />}
            label="Total Distance"
            value={`${kpis.totalDistanceKm} km`}
            tooltip="Total travel distance across all vehicles"
          />

          {/* Travel Time */}
          <KpiRow
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Travel Time"
            value={kpis.travelTime}
            tooltip="Total driving time across all vehicles"
          />

          {/* Service Time */}
          <KpiRow
            icon={<Truck className="h-3.5 w-3.5" />}
            label="Service Time"
            value={kpis.serviceTime}
            tooltip="Total time spent servicing jobs"
          />

          {/* Wait Time */}
          {(responseData.totalWaitTimeInSeconds || 0) > 0 && (
            <KpiRow
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Wait Time"
              value={kpis.waitTime}
              tooltip="Total idle time waiting for time windows"
            />
          )}

          <Separator />

          {/* Occupancy */}
          <KpiRow
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Occupancy"
            value={`${kpis.occupancy}%`}
            tooltip="How full the schedule is (work time vs capacity)"
          />

          {/* Workload Fairness */}
          {kpis.workloadFairness !== null && (
            <KpiRow
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="Workload Fairness"
              value={`${kpis.workloadFairness}%`}
              tooltip="How evenly work is distributed across resources (higher is better)"
            />
          )}

          {/* Constraint Violations */}
          {(kpis.hardViolations > 0 || kpis.softViolations > 0) && (
            <>
              <Separator />
              <div className="space-y-2">
                {kpis.hardViolations > 0 && (
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-destructive/10 border border-destructive/20 rounded">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                    <span className="text-xs font-medium text-destructive">
                      {kpis.hardViolations} hard constraint{kpis.hardViolations !== 1 ? 's' : ''} violated
                    </span>
                  </div>
                )}
                {kpis.softViolations > 0 && (
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-yellow-700">
                      {kpis.softViolations} soft constraint{kpis.softViolations !== 1 ? 's' : ''} violated
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Score Details (Always Visible) */}
          {kpis.score && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Score Details</span>
                </div>
                <div className="space-y-1 px-2 py-1.5 bg-muted/50 rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Hard Score:</span>
                    <span className={cn(
                      "font-medium",
                      (kpis.score.hardScore || 0) < 0 ? "text-destructive" : "text-green-600"
                    )}>
                      {kpis.score.hardScore || 0}
                    </span>
                  </div>
                  {typeof kpis.score.mediumScore === 'number' && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Medium Score:</span>
                      <span className={cn(
                        "font-medium",
                        kpis.score.mediumScore < 0 ? "text-yellow-600" : "text-green-600"
                      )}>
                        {kpis.score.mediumScore}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Soft Score:</span>
                    <span className={cn(
                      "font-medium",
                      (kpis.score.softScore || 0) < 0 ? "text-yellow-600" : "text-green-600"
                    )}>
                      {kpis.score.softScore || 0}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Explanation Section (Always Visible) */}
          {explanation && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Explanation</span>
                </div>
                <ExplanationContent explanation={explanation} />
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// Helper component for KPI rows
function KpiRow({
  icon,
  label,
  value,
  tooltip
}: {
  icon: React.ReactNode
  label: string
  value: string
  tooltip: string
}) {
  return (
    <div className="flex items-center justify-between">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <div className="text-muted-foreground">{icon}</div>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  )
}

// Explanation content component
function ExplanationContent({ explanation }: { explanation: JobExplanationResponse }) {
  const hasConflicts = explanation.conflicts != null
  const hasUnresolved = explanation.unresolved != null
  const hasIssues = hasConflicts || hasUnresolved

  return (
    <div className="space-y-2 px-2">
      {/* Conflicts Section */}
      {hasConflicts && explanation.conflicts && (
        <Alert variant="destructive" className="text-xs py-2">
          <AlertTriangle className="h-3 w-3" />
          <AlertTitle className="text-xs mb-1">Conflicts</AlertTitle>
          <AlertDescription>
            <ConflictItem conflict={explanation.conflicts} />
          </AlertDescription>
        </Alert>
      )}

      {/* Unresolved Constraints */}
      {hasUnresolved && explanation.unresolved && (
        <Alert variant="default" className="text-xs py-2">
          <AlertCircle className="h-3 w-3" />
          <AlertTitle className="text-xs mb-1">Unresolved</AlertTitle>
          <AlertDescription>
            <UnresolvedItem item={explanation.unresolved} />
          </AlertDescription>
        </Alert>
      )}

      {/* No Issues - Success State */}
      {!hasIssues && (
        <Alert variant="default" className="text-xs py-2">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <AlertTitle className="text-xs mb-1">No Issues Detected</AlertTitle>
          <AlertDescription>
            Solution meets all constraints
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Conflict item component
function ConflictItem({ conflict }: { conflict: NonNullable<JobExplanationResponse['conflicts']> }) {
  return (
    <div className="p-1.5 bg-destructive/5 rounded text-[11px]">
      <div className="space-y-0.5">
        <div className="font-medium">{formatConstraintName(conflict.constraint)}</div>
        {conflict.job && (
          <div className="text-muted-foreground">Job: {conflict.job}</div>
        )}
        {conflict.resource && (
          <div className="text-muted-foreground">Resource: {conflict.resource}</div>
        )}
        <div className="text-destructive/80">Score impact: {conflict.score}</div>
      </div>
    </div>
  )
}

// Unresolved item component
function UnresolvedItem({ item }: { item: NonNullable<JobExplanationResponse['unresolved']> }) {
  return (
    <div className="flex items-start justify-between p-1.5 bg-muted/50 rounded text-[11px]">
      <span className="font-medium">{formatConstraintName(item.constraint)}</span>
      <span className="text-muted-foreground">Impact: {item.score}</span>
    </div>
  )
}

// Helper to format constraint names
function formatConstraintName(constraint: string | undefined | null): string {
  if (!constraint) return 'Unknown Constraint'
  return constraint
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
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