'use client'

import { useMemo, useState, useEffect } from 'react'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
                  Vehicle
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

            {/* Vehicle rows */}
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
                    {/* Vehicle label */}
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
                                    "absolute top-1 h-8 rounded px-2 flex items-center text-white text-[10px] font-medium transition-all shadow-sm",
                                    isHighlighted && "ring-2 ring-white scale-110 z-10",
                                    isDimmed && "opacity-40",
                                    !highlightedJob && !isReordering && "hover:brightness-110",
                                    isReordering && "pointer-events-none opacity-50"
                                  )}
                                  style={{
                                    left: `${left}%`,
                                    width: `${Math.max(width, 1)}%`,
                                    backgroundColor: color,
                                    minWidth: '32px'
                                  }}
                                  onMouseEnter={() => !isReordering && onJobHover?.({ resource: resourceName, job: jobName })}
                                  onMouseLeave={() => onJobHover?.(null)}
                                  data-job-id={jobName}
                                  data-resource={resourceName}
                                  data-index={visitIdx}
                              >
                                <span className="truncate">{jobName}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium">{jobName}</p>
                                <p className="text-xs text-muted-foreground">
                                  Arrival: {formatTime(new Date(visit.arrival))}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Departure: {formatTime(new Date(departure))}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Duration: {durationMinutes} min
                                </p>
                                {visit.serviceTime && (
                                  <p className="text-xs text-muted-foreground">
                                    Service time: {Math.round(visit.serviceTime / 60)} min
                                  </p>
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