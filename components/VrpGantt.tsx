'use client'

import { useMemo, useState, useEffect } from 'react'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface VrpGanttProps {
  requestData: Record<string, unknown>
  responseData?: Vrp.OnRouteResponse | null
  className?: string
  highlightedJob?: { resource: string; job: string } | null
  onJobHover?: (job: { resource: string; job: string } | null) => void
}

// Route colors matching VrpMap
const ROUTE_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16'  // lime
]

export function VrpGantt({ requestData, responseData, className, highlightedJob, onJobHover }: VrpGanttProps) {
  // Create resource-to-color mapping for consistent colors across dates
  const resourceColors = useMemo(() => {
    if (!responseData?.trips?.length) return new Map<string, string>()

    const colorMap = new Map<string, string>()
    const uniqueResources = Array.from(new Set(responseData.trips.map(t => t.resource)))

    uniqueResources.forEach((resource, idx) => {
      colorMap.set(resource, ROUTE_COLORS[idx % ROUTE_COLORS.length])
    })

    return colorMap
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

  // Selected date state - default to first available date
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)
  const selectedDate = availableDates[selectedDateIndex] || null

  // Reset selected date index if it exceeds available dates (e.g., after solving new problem)
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
          const departureTime = visit.departure
            ? new Date(visit.departure).getTime()
            : arrivalTime + (visit.serviceTime || 0) * 1000

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
  const calculateWidth = (arrivalTime: string, departureTime?: string, serviceTime?: number) => {
    if (!timelineData) return 0

    const arrival = new Date(arrivalTime).getTime()
    const departure = departureTime
      ? new Date(departureTime).getTime()
      : arrival + (serviceTime || 0) * 1000

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
                const color = resourceColors.get(trip.resource) || ROUTE_COLORS[0]

                return (
                  <div
                    key={`${trip.resource}-${tripIdx}`}
                    className="flex hover:bg-muted/30 transition-colors"
                  >
                    {/* Vehicle label */}
                    <div className="w-32 flex-shrink-0 border-r p-2 flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-medium truncate">
                        {trip.resource}
                      </span>
                    </div>

                    {/* Timeline */}
                    <div
                      className="flex-1 relative"
                      style={{ height: '48px' }}
                    >
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
                          visit.departure,
                          visit.serviceTime
                        )

                        // Calculate duration in minutes
                        const arrival = new Date(visit.arrival).getTime()
                        const departure = visit.departure
                          ? new Date(visit.departure).getTime()
                          : arrival + (visit.serviceTime || 0) * 1000
                        const durationMinutes = Math.round((departure - arrival) / (1000 * 60))

                        const isHighlighted = highlightedJob &&
                          highlightedJob.resource === trip.resource &&
                          highlightedJob.job === visit.job

                        const isDimmed = highlightedJob && !isHighlighted

                        return (
                          <Tooltip key={visitIdx}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute top-1 h-8 rounded px-2 flex items-center text-white text-[10px] font-medium cursor-pointer transition-all shadow-sm",
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
                                onMouseEnter={() => onJobHover?.({ resource: trip.resource, job: visit.job })}
                                onMouseLeave={() => onJobHover?.(null)}
                              >
                                <span className="truncate">{visit.job}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium">{visit.job}</p>
                                <p className="text-xs text-muted-foreground">
                                  Arrival: {formatTime(new Date(visit.arrival))}
                                </p>
                                {visit.departure && (
                                  <p className="text-xs text-muted-foreground">
                                    Departure: {formatTime(new Date(visit.departure))}
                                  </p>
                                )}
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
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}