'use client'

import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FixedSizeList as List } from 'react-window'
import { createResourceColorMap, ROUTE_COLORS } from '@/lib/color-utils'

export interface JobReorderEvent {
  jobId: string
  afterJobId: string | null
  fromResource: string
  toResource: string
  fromIndex: number
  toIndex: number
}

interface VrpGanttVirtualizedProps {
  requestData: Record<string, unknown>
  responseData?: Vrp.OnRouteResponse | null
  className?: string
  highlightedJob?: { resource: string; job: string } | null
  onJobHover?: (job: { resource: string; job: string } | null) => void
  onJobReorder?: (event: JobReorderEvent) => void
  isReordering?: boolean
}

interface Visit {
  job: string | null
  arrival: string | null
  serviceTime?: number | null
}

interface TripWithVisits {
  resource: string | null
  visits?: Visit[]
}

interface TimelineData {
  startTime: number
  endTime: number
  totalDuration: number
  hours: Date[]
  totalHours: number
}

interface RowData {
  trip: TripWithVisits
  tripIdx: number
  color: string
  resourceName: string
}

export function VrpGanttVirtualized({
  responseData,
  className,
  highlightedJob,
  onJobHover,
}: VrpGanttVirtualizedProps) {
  const listRef = useRef<List>(null)
  const [, setHoveredJob] = useState<{ resource: string; job: string } | null>(null)

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
          const dateStr = date.toISOString().split('T')[0]
          dateSet.add(dateStr)
        }
      })
    })

    return Array.from(dateSet).sort()
  }, [responseData])

  // Selected date state - default to first available date
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)
  const selectedDate = availableDates[selectedDateIndex] || null

  // Reset selected date index if it exceeds available dates
  useEffect(() => {
    if (selectedDateIndex >= availableDates.length && availableDates.length > 0) {
      setSelectedDateIndex(0)
    }
  }, [availableDates.length, selectedDateIndex])

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
  const timelineData = useMemo((): TimelineData | null => {
    if (!filteredTrips.length) {
      return null
    }

    let minTime = Infinity
    let maxTime = -Infinity

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
  const timeToPosition = useCallback((timestamp: string): number => {
    if (!timelineData) return 0
    const time = new Date(timestamp).getTime()
    return ((time - timelineData.startTime) / timelineData.totalDuration) * 100
  }, [timelineData])

  // Convert arrival/departure times to width percentage
  const calculateWidth = useCallback((arrivalTime: string, serviceTime?: number | null): number => {
    if (!timelineData) return 0

    const arrival = new Date(arrivalTime).getTime()
    const departure = arrival + (serviceTime || 0) * 1000

    return ((departure - arrival) / timelineData.totalDuration) * 100
  }, [timelineData])

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  // Format date for display
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

  // Prepare row data for virtualization
  const rowData = useMemo((): RowData[] => {
    return filteredTrips.map((trip, tripIdx) => {
      const resourceName = trip.resource || 'Unknown'
      const color = resourceColors.get(resourceName) || ROUTE_COLORS[0]

      return {
        trip,
        tripIdx,
        color,
        resourceName
      }
    })
  }, [filteredTrips, resourceColors])

  // Row renderer for react-window
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const { trip, color, resourceName } = rowData[index]

    return (
      <div
        style={style}
        className="flex hover:bg-muted/30 transition-colors border-b border-border"
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
        <div className="flex-1 relative">
          {/* Hour grid lines */}
          {timelineData && timelineData.hours.map((_, idx) => (
            <div
              key={idx}
              className="absolute h-full border-r border-border/30"
              style={{ left: `${(idx / timelineData.totalHours) * 100}%` }}
            />
          ))}

          {/* Activity blocks */}
          {trip.visits?.map((visit, visitIdx) => {
            if (!visit.arrival || !timelineData) return null

            const left = timeToPosition(visit.arrival)
            const width = calculateWidth(visit.arrival, visit.serviceTime)

            // Calculate duration in minutes
            const arrival = new Date(visit.arrival).getTime()
            const departure = arrival + (visit.serviceTime || 0) * 1000
            const durationMinutes = Math.round((departure - arrival) / (1000 * 60))

            const jobName = visit.job || 'Unknown'
            const isHighlighted = highlightedJob &&
              highlightedJob.resource === resourceName &&
              highlightedJob.job === jobName

            const isDimmed = highlightedJob && !isHighlighted

            return (
              <div
                key={`${resourceName}-${jobName}-${visitIdx}`}
                className={cn(
                  "absolute top-1 h-8 rounded px-2 flex items-center text-white text-[10px] font-medium transition-all shadow-sm cursor-pointer",
                  isHighlighted && "ring-2 ring-white scale-110 z-10",
                  isDimmed && "opacity-40",
                  !highlightedJob && "hover:brightness-110"
                )}
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 1)}%`,
                  backgroundColor: color,
                  minWidth: '32px'
                }}
                onMouseEnter={() => {
                  setHoveredJob({ resource: resourceName, job: jobName })
                  onJobHover?.({ resource: resourceName, job: jobName })
                }}
                onMouseLeave={() => {
                  setHoveredJob(null)
                  onJobHover?.(null)
                }}
                title={`${jobName}\nArrival: ${formatTime(new Date(visit.arrival))}\nDeparture: ${formatTime(new Date(departure))}\nDuration: ${durationMinutes} min`}
              >
                <span className="truncate">{jobName}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }, [rowData, timelineData, highlightedJob, onJobHover, timeToPosition, calculateWidth])

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

  const ROW_HEIGHT = 48

  return (
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
        <span className="text-xs text-muted-foreground ml-2">
          {filteredTrips.length} vehicle{filteredTrips.length !== 1 ? 's' : ''}
        </span>
      </div>

      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full flex flex-col min-w-[800px]">
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

          {/* Virtualized vehicle rows */}
          <div className="flex-1">
            <List
              ref={listRef}
              height={window.innerHeight - 300} // Adjust based on your layout
              itemCount={rowData.length}
              itemSize={ROW_HEIGHT}
              width="100%"
              overscanCount={5} // Render 5 extra rows above/below viewport for smooth scrolling
            >
              {Row}
            </List>
          </div>
        </div>
      </CardContent>

      {/* Performance info */}
      <div className="px-3 py-1 border-t bg-muted/30">
        <span className="text-[10px] text-muted-foreground">
          Performance mode: Virtualized rendering (showing {Math.min(10, filteredTrips.length)} of {filteredTrips.length} rows)
        </span>
      </div>
    </Card>
  )
}
