'use client'

import { useMemo, useState, useEffect } from 'react'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { matchTags, getTagMatchSummary } from '@/lib/tag-matcher'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, pointerWithin } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '@/components/ui/sortable-item'
import { createResourceColorMap, ROUTE_COLORS } from '@/lib/color-utils'

export interface JobReorderEvent {
  jobId: string
  afterJobId: string | null
  fromResource: string
  toResource: string
  fromIndex: number
  toIndex: number
}

interface VrpGanttProps {
  requestData: Record<string, unknown>
  responseData?: Vrp.OnRouteResponse | null
  className?: string
  highlightedJob?: { resource: string; job: string } | null
  onJobHover?: (job: { resource: string; job: string } | null) => void
  onJobReorder?: (event: JobReorderEvent) => void
  isReordering?: boolean
  selectedDateIndex?: number
  onDateChange?: (dateIndex: number) => void
}

export function VrpGantt({
  requestData,
  responseData,
  className,
  highlightedJob,
  onJobHover,
  onJobReorder,
  isReordering = false,
  selectedDateIndex: externalSelectedDateIndex,
  onDateChange
}: VrpGanttProps) {
  const [activeJobData, setActiveJobData] = useState<{
    jobId: string
    resource: string
    color: string
  } | null>(null)
  const [dropTargetResource, setDropTargetResource] = useState<string | null>(null)

  // Create resource-to-color mapping for consistent colors across dates
  const resourceColors = useMemo(() => {
    if (!responseData?.trips) return new Map<string, string>()
    return createResourceColorMap(responseData.trips)
  }, [responseData])

  // Extract unique dates from all trips
  const availableDates = useMemo(() => {
    if (!responseData?.trips?.length) return []

    const dateSet = new Set<string>()
    responseData.trips.forEach(trip => {
      trip.visits?.forEach(visit => {
        if (visit.arrival) {
          const date = new Date(visit.arrival)
          // Use date string in format YYYY-MM-DD for consistent comparison
          const dateStr = date.toISOString().split('T')[0]
          dateSet.add(dateStr)
        }
      })
    })

    return Array.from(dateSet).sort()
  }, [responseData])

  // Selected date state - use external control if provided, otherwise internal state
  const [internalSelectedDateIndex, setInternalSelectedDateIndex] = useState(0)
  const selectedDateIndex = externalSelectedDateIndex ?? internalSelectedDateIndex
  const setSelectedDateIndex = onDateChange ?? setInternalSelectedDateIndex
  const selectedDate = availableDates[selectedDateIndex] || null

  // Reset selected date index if it exceeds available dates (e.g., after solving new problem)
  useEffect(() => {
    if (selectedDateIndex >= availableDates.length && availableDates.length > 0) {
      setSelectedDateIndex(0)
    }
  }, [availableDates.length, selectedDateIndex, setSelectedDateIndex])

  // Filter trips to only include visits on the selected date
  const filteredTrips = useMemo(() => {
    if (!responseData?.trips?.length || !selectedDate) return []

    return responseData.trips.map(trip => ({
      ...trip,
      visits: trip.visits?.filter(visit => {
        if (!visit.arrival) return false
        const visitDate = new Date(visit.arrival).toISOString().split('T')[0]
        return visitDate === selectedDate
      })
    })).filter(trip => trip.visits && trip.visits.length > 0)
  }, [responseData, selectedDate])

  // Calculate time range and generate hour columns for selected date only
  const timelineData = useMemo(() => {
    if (!filteredTrips.length) {
      return null
    }

    let minTime = Infinity
    let maxTime = -Infinity

    // Find min/max times for selected date only
    filteredTrips.forEach(trip => {
      trip.visits?.forEach(visit => {
        if (visit.arrival) {
          const arrivalTime = new Date(visit.arrival).getTime()
          const departureTime = arrivalTime + (visit.serviceTime || 0) * 1000

          minTime = Math.min(minTime, arrivalTime)
          maxTime = Math.max(maxTime, departureTime)
        }
      })
    })

    if (!isFinite(minTime) || !isFinite(maxTime)) {
      return null
    }

    const startDate = new Date(minTime)
    const endDate = new Date(maxTime)

    // Round start to hour boundary (floor)
    startDate.setMinutes(0, 0, 0)

    // Round end to hour boundary (ceil)
    endDate.setMinutes(59, 59, 999)

    const startTime = startDate.getTime()
    const endTime = endDate.getTime()
    const totalDuration = endTime - startTime
    const totalHours = Math.ceil(totalDuration / (1000 * 60 * 60))

    // Generate hour markers
    const hours = Array.from({ length: totalHours + 1 }, (_, i) => {
      return new Date(startTime + i * 60 * 60 * 1000)
    })

    return {
      startTime,
      endTime,
      totalDuration,
      hours,
      totalHours
    }
  }, [filteredTrips])

  // Convert timestamp to percentage position (0-100)
  const timeToPosition = (timestamp: string) => {
    if (!timelineData) return 0
    const time = new Date(timestamp).getTime()
    return ((time - timelineData.startTime) / timelineData.totalDuration) * 100
  }

  // Convert arrival/departure times to width percentage
  const calculateWidth = (arrivalTime: string, serviceTime?: number | null) => {
    if (!timelineData) return 0

    const arrival = new Date(arrivalTime).getTime()
    const departure = arrival + (serviceTime || 0) * 1000

    return ((departure - arrival) / timelineData.totalDuration) * 100
  }

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  // Format date for display (e.g., "Wed, Jan 15")
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  // Look up job details from request data by name
  const getJobDetails = useMemo(() => {
    if (!requestData?.jobs || !Array.isArray(requestData.jobs)) {
      return new Map()
    }
    return new Map(
      (requestData.jobs as Array<{
        name: string
        windows?: Array<{ from: string; to: string }>
        tags?: Array<{ name: string; hard?: boolean; weight?: number }>
        priority?: number | null
        urgency?: number | null
        load?: Array<number> | null
        complexity?: number | null
        duration?: number | null
      }>).map(job => [job.name, job])
    )
  }, [requestData])

  // Look up resource details from request data by name
  const getResourceDetails = useMemo(() => {
    if (!requestData?.resources || !Array.isArray(requestData.resources)) {
      return new Map()
    }
    return new Map(
      (requestData.resources as Array<{
        name: string
        tags?: string[]
      }>).map(resource => [resource.name, resource])
    )
  }, [requestData])

  // Navigation handlers
  const goToPreviousDate = () => {
    if (selectedDateIndex > 0) {
      setSelectedDateIndex(selectedDateIndex - 1)
    }
  }

  const goToNextDate = () => {
    if (selectedDateIndex < availableDates.length - 1) {
      setSelectedDateIndex(selectedDateIndex + 1)
    }
  }

  const hasPreviousDate = selectedDateIndex > 0
  const hasNextDate = selectedDateIndex < availableDates.length - 1

  // Drag-and-drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string

    // Extract resource and job from sortableId format: "resourceName-jobName-index"
    const parts = id.split('-')
    const resource = parts[0]
    const jobId = parts.slice(1, -1).join('-') // Everything except first and last (exclude index)
    const color = resourceColors.get(resource) || ROUTE_COLORS[0]

    setActiveJobData({ jobId, resource, color })
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (event.over) {
      const overData = event.over.data.current as { resource: string } | undefined
      setDropTargetResource(overData?.resource || null)
    } else {
      setDropTargetResource(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveJobData(null)
    setDropTargetResource(null)

    if (!over || !onJobReorder) return
    if (active.id === over.id) return

    const activeData = active.data.current as {
      jobId: string
      resource: string
      index: number
    }
    const overData = over.data.current as {
      jobId: string
      resource: string
      index: number
    }

    if (!activeData || !overData) return

    // Determine afterJobId based on target position
    let afterJobId: string | null = null
    if (overData.index > 0) {
      // Find the job before the target position
      const targetTrip = filteredTrips.find(t => t.resource === overData.resource)
      if (targetTrip?.visits && targetTrip.visits[overData.index - 1]) {
        afterJobId = targetTrip.visits[overData.index - 1].job || null
      }
    }

    onJobReorder({
      jobId: activeData.jobId,
      afterJobId,
      fromResource: activeData.resource,
      toResource: overData.resource,
      fromIndex: activeData.index,
      toIndex: overData.index,
    })
  }

  if (!responseData?.trips?.length) {
    return (
      <Card className={cn("w-full h-full flex items-center justify-center", className)}>
        <CardContent className="text-center text-muted-foreground">
          No route data available. Solve a VRP problem to see the timeline.
        </CardContent>
      </Card>
    )
  }

  if (!timelineData || !selectedDate) {
    return (
      <Card className={cn("w-full h-full flex items-center justify-center", className)}>
        <CardContent className="text-center text-muted-foreground">
          Unable to generate timeline. No valid time data in solution.
        </CardContent>
      </Card>
    )
  }

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <TooltipProvider>
        <Card className={cn("w-full h-full flex flex-col p-0", className)}>
          {/* Date navigation header */}
          <div className="flex items-center justify-end gap-2 px-3 py-1.5 border-b">
          <span className="sr-only">Viewing date:</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousDate}
            disabled={!hasPreviousDate}
            className="h-8 w-8"
            aria-label="Previous date"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {formatDate(selectedDate)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextDate}
            disabled={!hasNextDate}
            className="h-8 w-8"
            aria-label="Next date"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <CardContent className="flex-1 overflow-auto p-0">
          <div className="min-w-[800px]">
            {/* Time header */}
            <div className="sticky top-0 z-10 bg-background border-b">
              <div className="flex h-10">
                <div className="w-32 flex-shrink-0 border-r flex items-center px-2 text-xs font-medium text-muted-foreground bg-muted/50">
                  Resource
                </div>
                <div className="flex-1 relative bg-muted/30">
                  {timelineData.hours.map((hour, idx) => (
                    <div
                      key={idx}
                      className="absolute h-full border-r border-border/50 flex items-center justify-center"
                      style={{
                        left: `${(idx / timelineData.totalHours) * 100}%`,
                        width: `${(1 / timelineData.totalHours) * 100}%`
                      }}
                    >
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {formatTime(hour)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resource rows */}
            <div className="divide-y divide-border">
              {filteredTrips.map((trip, tripIdx) => {
                const resourceName = trip.resource || 'Unknown'
                const color = resourceColors.get(resourceName) || ROUTE_COLORS[0]

                // Create sortable IDs for jobs in this trip
                const jobIds = trip.visits?.map((v, i) =>
                  `${resourceName}-${v.job}-${i}`
                ) || []

                return (
                  <SortableContext
                    key={`${resourceName}-${tripIdx}`}
                    items={jobIds}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div
                      className="flex hover:bg-muted/30 transition-colors"
                    >
                    {/* Resource label */}
                    <div className="w-32 flex-shrink-0 border-r p-2 flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-medium truncate">
                        {resourceName}
                      </span>
                    </div>

                    {/* Timeline */}
                    <div
                      className="flex-1 relative"
                      style={{ height: '48px' }}
                    >
                      {/* Drop zone indicator */}
                      {dropTargetResource === resourceName && (
                        <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded pointer-events-none" />
                      )}
                      {/* Hour grid lines */}
                      {timelineData.hours.map((_, idx) => (
                        <div
                          key={idx}
                          className="absolute h-full border-r border-border/30"
                          style={{ left: `${(idx / timelineData.totalHours) * 100}%` }}
                        />
                      ))}

                      {/* Activity blocks */}
                      {trip.visits?.map((visit, visitIdx) => {
                        if (!visit.arrival) return null

                        const left = timeToPosition(visit.arrival)
                        const width = calculateWidth(
                          visit.arrival,
                          visit.serviceTime
                        )

                        // Calculate duration in minutes
                        const arrival = new Date(visit.arrival).getTime()
                        const departure = arrival + (visit.serviceTime || 0) * 1000
                        const durationMinutes = Math.round((departure - arrival) / (1000 * 60))

                        const jobName = visit.job || 'Unknown'
                        const sortableId = `${resourceName}-${jobName}-${visitIdx}`
                        const isHighlighted = highlightedJob &&
                          highlightedJob.resource === resourceName &&
                          highlightedJob.job === jobName

                        const isDimmed = highlightedJob && !isHighlighted

                        // Calculate tag matching
                        const jobDetails = getJobDetails.get(jobName)
                        const resourceDetails = getResourceDetails.get(resourceName)
                        const tagMatchResult = matchTags(jobDetails?.tags, resourceDetails?.tags)
                        const hasTagViolation = tagMatchResult.hasRequirements &&
                          (!tagMatchResult.allHardMatched || !tagMatchResult.allSoftMatched)

                        return (
                          <SortableItem
                            key={sortableId}
                            id={sortableId}
                            disabled={isReordering}
                            data={{
                              jobId: jobName,
                              resource: resourceName,
                              index: visitIdx
                            }}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "absolute top-1 h-8 rounded px-2 flex items-center text-white text-[10px] font-medium transition-all shadow-sm min-w-8",
                                    isHighlighted && "ring-2 ring-white scale-110 z-10",
                                    isDimmed && "opacity-40",
                                    !highlightedJob && !isReordering && "hover:brightness-110",
                                    isReordering && "pointer-events-none opacity-50"
                                  )}
                                  style={{
                                    left: `${left}%`,
                                    width: `${Math.max(width, 1)}%`,
                                    backgroundColor: color
                                  }}
                                  onMouseEnter={() => !isReordering && onJobHover?.({ resource: resourceName, job: jobName })}
                                  onMouseLeave={() => onJobHover?.(null)}
                                  data-job-id={jobName}
                                  data-resource={resourceName}
                                  data-index={visitIdx}
                              >
                                <span className="truncate">{jobName}</span>
                                {hasTagViolation && (
                                  <div className="absolute -top-1.5 -right-1.5">
                                    <Badge
                                      variant={!tagMatchResult.allHardMatched ? "destructive" : "default"}
                                      className="h-4 w-4 p-0 flex items-center justify-center rounded-full"
                                      aria-label={getTagMatchSummary(tagMatchResult)}
                                    >
                                      {!tagMatchResult.allHardMatched ? (
                                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                                      ) : (
                                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                      )}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-2">
                                {/* Job Name Header */}
                                <p className="font-medium text-sm">{jobName}</p>

                                {/* Job Details (priority, urgency, load, complexity) */}
                                {(() => {
                                  const jobDetails = getJobDetails.get(jobName)
                                  const hasPriority = jobDetails?.priority != null
                                  const hasUrgency = jobDetails?.urgency != null
                                  const hasLoad = jobDetails?.load && jobDetails.load.length > 0
                                  const hasComplexity = jobDetails?.complexity != null

                                  if (!hasPriority && !hasUrgency && !hasLoad && !hasComplexity) {
                                    return null
                                  }

                                  return (
                                    <div className="space-y-0.5 pt-1 border-t border-primary-foreground/20">
                                      {(hasPriority || hasUrgency) && (
                                        <div className="flex gap-3">
                                          {hasPriority && (
                                            <p className="text-xs text-primary-foreground/90">
                                              Priority: <span className="font-medium">{jobDetails.priority}</span>
                                            </p>
                                          )}
                                          {hasUrgency && (
                                            <p className="text-xs text-primary-foreground/90">
                                              Urgency: <span className="font-medium">{jobDetails.urgency}</span>
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      {hasLoad && (
                                        <p className="text-xs text-primary-foreground/90">
                                          Load: <span className="font-medium">[{jobDetails.load?.join(', ')}]</span>
                                        </p>
                                      )}
                                      {hasComplexity && (
                                        <p className="text-xs text-primary-foreground/90">
                                          Complexity: <span className="font-medium">{jobDetails.complexity}</span>
                                        </p>
                                      )}
                                    </div>
                                  )
                                })()}

                                {/* Timing Information */}
                                <div className="space-y-0.5 pt-1 border-t border-primary-foreground/20">
                                  <p className="text-xs text-primary-foreground/90">
                                    Arrival: {formatTime(new Date(visit.arrival))}
                                  </p>
                                  <p className="text-xs text-primary-foreground/90">
                                    Departure: {formatTime(new Date(departure))}
                                  </p>
                                  <p className="text-xs text-primary-foreground/90">
                                    Duration: {durationMinutes} min
                                  </p>
                                  {visit.serviceTime && (
                                    <p className="text-xs text-primary-foreground/90">
                                      Service time: {Math.round(visit.serviceTime / 60)} min
                                    </p>
                                  )}
                                </div>

                                {/* Time Windows (if available) */}
                                {(() => {
                                  const jobDetails = getJobDetails.get(jobName)
                                  if (jobDetails?.windows && jobDetails.windows.length > 0) {
                                    return (
                                      <div className="space-y-0.5 pt-1 border-t border-primary-foreground/20">
                                        <p className="text-xs font-medium text-primary-foreground/90">
                                          Time Window{jobDetails.windows.length > 1 ? 's' : ''}:
                                        </p>
                                        {jobDetails.windows.map((timeWindow: { from: string; to: string }, idx: number) => (
                                          <p key={idx} className="text-xs text-primary-foreground/80 pl-2">
                                            {formatTime(new Date(timeWindow.from))} - {formatTime(new Date(timeWindow.to))}
                                          </p>
                                        ))}
                                      </div>
                                    )
                                  }
                                  return null
                                })()}

                                {/* Tag Matching Section (if job has tag requirements) */}
                                {tagMatchResult.hasRequirements && (
                                  <div className="space-y-1 pt-1 border-t border-primary-foreground/20" role="status">
                                    {/* Match Quality Header */}
                                    <div className="flex items-center gap-1.5">
                                      {tagMatchResult.allHardMatched && tagMatchResult.allSoftMatched ? (
                                        <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                                      ) : !tagMatchResult.allHardMatched ? (
                                        <AlertCircle className="h-3 w-3 text-destructive" />
                                      ) : (
                                        <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                      )}
                                      <p className="text-xs font-medium text-primary-foreground/90">
                                        Tag Matching: {getTagMatchSummary(tagMatchResult)}
                                      </p>
                                    </div>

                                    {/* Required Tags */}
                                    {jobDetails?.tags && jobDetails.tags.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-medium text-primary-foreground/70 mb-0.5">
                                          Required:
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                          {jobDetails.tags.map((tag: { name: string; hard?: boolean; weight?: number }, idx: number) => {
                                            const isMatched = tagMatchResult.matchedTags.includes(tag.name)
                                            const isMissing = tag.hard !== false
                                              ? tagMatchResult.missingHardTags.includes(tag.name)
                                              : tagMatchResult.missingSoftTags.includes(tag.name)

                                            return (
                                              <span
                                                key={idx}
                                                className={cn(
                                                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                                                  isMatched && "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-green-500/20",
                                                  isMissing && tag.hard !== false && "bg-destructive/10 text-destructive dark:text-red-300 ring-1 ring-destructive/20",
                                                  isMissing && tag.hard === false && "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20"
                                                )}
                                              >
                                                {isMatched ? (
                                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                                ) : (
                                                  <X className="h-2.5 w-2.5" />
                                                )}
                                                {tag.name}
                                                {tag.hard !== false && <span className="ml-0.5" aria-label="Required">*</span>}
                                              </span>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Resource Tags */}
                                    {resourceDetails?.tags && resourceDetails.tags.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-medium text-primary-foreground/70 mb-0.5">
                                          Resource ({resourceName}):
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                          {resourceDetails.tags.map((tag: string, idx: number) => (
                                            <span
                                              key={idx}
                                              className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary-foreground/10 text-primary-foreground/80"
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          </SortableItem>
                        )
                      })}
                    </div>
                  </div>
                  </SortableContext>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>

    {/* Drag overlay for visual feedback */}
    <DragOverlay>
      {activeJobData ? (
        <div
          className="h-8 rounded px-2 flex items-center text-white text-[10px] font-medium shadow-2xl ring-2 ring-primary/50"
          style={{
            backgroundColor: activeJobData.color,
            width: '120px',
            maxWidth: '200px'
          }}
        >
          <span className="truncate">{activeJobData.jobId}</span>
        </div>
      ) : null}
    </DragOverlay>
  </DndContext>
  )
}