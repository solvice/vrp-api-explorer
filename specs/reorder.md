# VRP Gantt Chart Interactive Job Reordering

## Overview

This specification defines the implementation of drag-and-drop job reordering functionality in the VRP Gantt chart component, allowing users to interactively modify route sequences and vehicle assignments, triggering real-time VRP re-optimization and KPI updates.

**Key Innovation:** Uses Solvice's new `/v2/vrp/sync/jobs/{id}/change` API with two modes:
- **Evaluate mode (~200ms):** Instant preview showing score impact during drag
- **Solve mode (~2-5s):** Full re-optimization on drop, respecting manual change

This enables a "try before you commit" workflow where users see the exact impact of their changes before applying them.

### Use Cases
- **Dispatcher override**: Manual adjustments to respect customer preferences
- **What-if analysis**: "What happens if I move this job to earlier in the route?"
- **Constraint testing**: See score impact and feasibility warnings before committing
- **Real-time preview**: Drag jobs and see immediate feedback with score deltas
- **Score-based decisions**: Compare solution quality (Original: -1234 → Modified: -2100 = 866 points worse)

## Current State Analysis

### Existing Architecture

**VrpGantt Component** (`components/VrpGantt.tsx`)
- Clean shadcn/ui implementation using Card, Button, and Tooltip primitives
- Minimal CSS Grid-based timeline visualization with zero external dependencies
- Proper TypeScript typing with Solvice SDK (`Vrp.OnRouteResponse`)
- Accessibility features: ARIA labels, keyboard navigation for date switching
- Color-coded activity blocks with hover tooltips showing timing details
- Synced highlighting with VrpMap via `highlightedJob` prop

**VrpExplorer Orchestrator** (`components/VrpExplorer.tsx`)
- Manages VRP request/response state
- Handles API calls to `/api/vrp/solve` endpoint
- Coordinates data flow between editor, map, Gantt, and KPI components
- Recent addition: KPI bar displayed between map and Gantt chart

**Data Flow**
```
VrpJsonEditor → VrpExplorer → /api/vrp/solve → VrpResponse
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
    VrpMap       VrpGantt      VrpKpiBar
```

### Gaps for Interactivity

1. **No drag-and-drop library** - Need React DnD solution compatible with shadcn/ui
2. **Static activity blocks** - Only hover interactions, no drag handlers
3. **No reorder mutation logic** - Missing API endpoint and state update flow
4. **No constraint validation UI** - Can't preview or validate moves before applying
5. **Missing visual feedback** - No drag states, drop zones, or loading indicators

## Implementation Strategy

### Phase 1: Drag-and-Drop Foundation (2-3 days)

#### 1.1 Install Dependencies

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Why @dnd-kit:**
- Modern React DnD library with excellent TypeScript support
- Zero dependencies, tree-shakeable architecture
- Accessible by default (keyboard navigation, screen readers)
- Compatible with shadcn/ui design patterns
- Supports both pointer and touch interactions
- Flexible collision detection and animation utilities

#### 1.2 Create Shadcn-Compatible Drag Components

**`components/ui/sortable-item.tsx`**
```typescript
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

interface SortableItemProps {
  id: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export function SortableItem({ id, children, disabled, className }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && "opacity-50 scale-105 z-50 cursor-grabbing",
        !disabled && "cursor-grab",
        className
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}
```

**`components/ui/drop-indicator.tsx`**
```typescript
import { cn } from '@/lib/utils'

interface DropIndicatorProps {
  isOver: boolean
  isValid: boolean
  className?: string
}

export function DropIndicator({ isOver, isValid, className }: DropIndicatorProps) {
  if (!isOver) return null

  return (
    <div
      className={cn(
        "absolute inset-0 border-2 rounded pointer-events-none",
        isValid ? "border-primary bg-primary/10" : "border-destructive bg-destructive/10",
        className
      )}
      aria-hidden="true"
    />
  )
}
```

#### 1.3 Modify VrpGantt for Drag Support

**Changes to `components/VrpGantt.tsx`:**

```typescript
import { DndContext, DragEndEvent, DragOverlay, closestCenter } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '@/components/ui/sortable-item'

interface VrpGanttProps {
  requestData: Record<string, unknown>
  responseData?: Vrp.OnRouteResponse | null
  className?: string
  highlightedJob?: { resource: string; job: string } | null
  onJobHover?: (job: { resource: string; job: string } | null) => void
  onJobReorder?: (event: JobReorderEvent) => void  // NEW
  isReordering?: boolean  // NEW
}

interface JobReorderEvent {
  jobId: string
  fromResource: string
  toResource: string
  fromIndex: number
  toIndex: number
}

export function VrpGantt({
  requestData,
  responseData,
  className,
  highlightedJob,
  onJobHover,
  onJobReorder,  // NEW
  isReordering = false  // NEW
}: VrpGanttProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)

    if (!event.over || !onJobReorder) return

    const activeData = event.active.data.current
    const overData = event.over.data.current

    if (!activeData || !overData) return

    onJobReorder({
      jobId: activeData.jobId,
      fromResource: activeData.resource,
      toResource: overData.resource,
      fromIndex: activeData.index,
      toIndex: overData.index,
    })
  }

  // Wrap timeline rows with DndContext and SortableContext
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <TooltipProvider>
        <Card className={cn("w-full h-full flex flex-col p-0", className)}>
          {/* Date navigation header - unchanged */}

          <CardContent className="flex-1 overflow-auto p-0">
            <div className="min-w-[800px]">
              {/* Time header - unchanged */}

              {/* Vehicle rows - now with sortable contexts */}
              <div className="divide-y divide-border">
                {filteredTrips.map((trip, tripIdx) => {
                  const resourceName = trip.resource || 'Unknown'
                  const jobIds = trip.visits?.map((v, i) =>
                    `${resourceName}-${v.job}-${i}`
                  ) || []

                  return (
                    <SortableContext
                      key={`${resourceName}-${tripIdx}`}
                      items={jobIds}
                      strategy={horizontalListSortingStrategy}
                    >
                      <div className="flex hover:bg-muted/30 transition-colors">
                        {/* Vehicle label - unchanged */}

                        {/* Timeline with sortable activity blocks */}
                        <div className="flex-1 relative" style={{ height: '48px' }}>
                          {/* Hour grid lines - unchanged */}

                          {/* Activity blocks - now sortable */}
                          {trip.visits?.map((visit, visitIdx) => {
                            if (!visit.arrival) return null

                            const sortableId = `${resourceName}-${visit.job}-${visitIdx}`
                            const jobName = visit.job || 'Unknown'

                            return (
                              <SortableItem
                                key={sortableId}
                                id={sortableId}
                                disabled={isReordering}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        "absolute top-1 h-8 rounded px-2 flex items-center",
                                        "text-white text-[10px] font-medium",
                                        "transition-all shadow-sm",
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
                                      onMouseEnter={() => !isReordering && onJobHover?.({
                                        resource: resourceName,
                                        job: jobName
                                      })}
                                      onMouseLeave={() => onJobHover?.(null)}
                                    >
                                      <span className="truncate">{jobName}</span>
                                    </div>
                                  </TooltipTrigger>
                                  {/* Tooltip content - unchanged */}
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
        {activeId ? (
          <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium shadow-lg">
            {activeId.split('-')[1]} {/* Extract job name */}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
```

**Key Changes:**
- Wrap component with `DndContext` for drag-and-drop orchestration
- Use `SortableContext` per vehicle row with `horizontalListSortingStrategy`
- Convert activity blocks to `SortableItem` components
- Add `onJobReorder` callback prop to emit reorder events
- Add `isReordering` prop to disable interactions during API calls
- Implement `DragOverlay` for smooth drag preview
- Disable pointer events on blocks during reordering

### Phase 2: Backend Re-optimization (3-4 days)

#### 2.1 Use Solvice VRP Change API

**Solvice provides a specialized `/v2/vrp/sync/jobs/{id}/change` API** designed specifically for interactive job reordering with two operation modes:

**`evaluate` mode (~200ms):** Fast impact assessment without full re-optimization. Returns modified solution showing new routes, updated score, and feasibility metrics. Perfect for real-time drag preview.

**`solve` mode (~2-5s):** Full re-optimization with the manual change as a constraint. Returns fully optimized solution respecting the user's manual adjustment.

**Strategy:** Use `evaluate` for instant feedback during drag, then `solve` on drop for final solution.

#### 2.2 Create Reorder API Endpoint

**`app/api/vrp/reorder/route.ts`** (new file)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import Solvice from 'solvice-vrp-solver'

interface ReorderRequest {
  jobId: string              // Job being moved
  afterJobId: string | null  // Job to insert after (null = first position)
  operation: 'evaluate' | 'solve'  // Fast preview vs full re-optimization
  originalSolutionId: string       // ID from original solve response
}

interface ReorderResponse {
  solution: Vrp.OnRouteResponse
  scoreComparison?: {
    original: number
    modified: number
    delta: number
    deltaPercent: number
  }
  feasibilityWarnings?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.SOLVICE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured', type: 'authentication' },
        { status: 401 }
      )
    }

    const body: ReorderRequest = await request.json()
    const { jobId, afterJobId, operation, originalSolutionId } = body

    // Call Solvice VRP Change API
    const client = new Solvice({ apiKey })

    // Construct change specification
    const changeSpec = {
      changes: [
        {
          job: jobId,
          after: afterJobId,
          // arrival time is optional - let solver optimize if not specified
        }
      ],
      operation: operation  // 'evaluate' for preview, 'solve' for final
    }

    // Call the new change API endpoint
    // POST /v2/vrp/sync/jobs/{originalSolutionId}/change
    const response = await fetch(
      `https://api.solvice.io/v2/vrp/sync/jobs/${originalSolutionId}/change`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changeSpec)
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Change API request failed')
    }

    const newSolution: Vrp.OnRouteResponse = await response.json()

    // Calculate score comparison if original solution score available
    const scoreComparison = calculateScoreComparison(
      newSolution,
      originalSolutionId // Would need to cache original scores
    )

    return NextResponse.json({
      solution: newSolution,
      scoreComparison,
      feasibilityWarnings: extractFeasibilityWarnings(newSolution)
    } as ReorderResponse)

  } catch (error) {
    console.error('VRP reorder error:', error)

    if (error instanceof Solvice.APIError) {
      return NextResponse.json(
        {
          error: error.message,
          type: error.status === 401 ? 'authentication' : 'server'
        },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { error: 'Failed to reorder jobs', type: 'unknown' },
      { status: 500 }
    )
  }
}

function calculateScoreComparison(
  newSolution: Vrp.OnRouteResponse,
  originalSolutionId: string
): ReorderResponse['scoreComparison'] {
  // TODO: Implement score caching to compare with original
  // For now, return undefined - client can compare KPIs instead
  return undefined
}

function extractFeasibilityWarnings(
  solution: Vrp.OnRouteResponse
): string[] {
  const warnings: string[] = []

  // Check for constraint violations in solution
  solution.trips?.forEach(trip => {
    trip.visits?.forEach(visit => {
      if (visit.violatedConstraints?.length) {
        warnings.push(
          `Job ${visit.job}: ${visit.violatedConstraints.join(', ')}`
        )
      }
    })
  })

  return warnings
}
```

**Key Benefits of Using Change API:**
- **10x faster evaluation:** ~200ms vs ~2-5s for full solve
- **Preserves user intent:** Manual change is respected as constraint
- **Score comparison:** See exact impact on solution quality
- **Incremental approach:** Evaluate first (fast preview), solve second (final result)
- **Feasibility feedback:** Warnings about constraint violations

#### 2.3 Integrate with VrpExplorer

**Changes to `components/VrpExplorer.tsx`:**

```typescript
export function VrpExplorer() {
  // Add reordering state
  const [isReordering, setIsReordering] = useState(false)
  const [previewSolution, setPreviewSolution] = useState<Vrp.OnRouteResponse | null>(null)

  // Store original solution ID for Change API
  const originalSolutionId = vrpResponse.data?.id

  // Handle drag hover - call evaluate for instant preview
  const handleJobDragOver = useCallback(async (event: JobReorderEvent) => {
    if (!originalSolutionId) return

    try {
      // Call Change API in evaluate mode for fast preview (~200ms)
      const response = await fetch('/api/vrp/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: event.jobId,
          afterJobId: determineAfterJobId(event),  // Helper to convert position to afterJobId
          operation: 'evaluate',  // Fast preview mode
          originalSolutionId
        })
      })

      if (!response.ok) return // Silently fail for preview

      const { solution, scoreComparison } = await response.json()

      // Show preview solution with score delta
      setPreviewSolution(solution)

      if (scoreComparison) {
        toast.info(
          `Preview: ${scoreComparison.delta > 0 ? '↑' : '↓'} ${Math.abs(scoreComparison.delta)} points (${scoreComparison.deltaPercent.toFixed(1)}% ${scoreComparison.delta > 0 ? 'worse' : 'better'})`,
          { duration: 2000 }
        )
      }
    } catch (error) {
      console.error('Preview error:', error)
      // Don't block drag interaction
    }
  }, [originalSolutionId])

  // Handle final drop - call solve for full re-optimization
  const handleJobReorder = useCallback(async (event: JobReorderEvent) => {
    console.log('Job reorder requested:', event)

    if (!originalSolutionId) {
      toast.error('No solution ID available for reordering')
      return
    }

    // Validate move locally first
    const validation = validateReorder(event, vrpRequest.data, vrpResponse.data)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid job move')
      return
    }

    setIsReordering(true)
    setPreviewSolution(null)  // Clear preview

    try {
      const toastId = toast.loading('Re-optimizing routes...')

      // Call Change API in solve mode for full optimization (~2-5s)
      const response = await fetch('/api/vrp/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: event.jobId,
          afterJobId: determineAfterJobId(event),
          operation: 'solve',  // Full re-optimization mode
          originalSolutionId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new VrpApiError(
          errorData.error || 'Reorder failed',
          errorData.type || 'unknown'
        )
      }

      const { solution, scoreComparison, feasibilityWarnings } = await response.json()

      toast.dismiss(toastId)

      // Show score comparison
      if (scoreComparison) {
        const deltaMsg = scoreComparison.delta > 0
          ? `${scoreComparison.delta} points worse`
          : `${Math.abs(scoreComparison.delta)} points better`

        toast.success(
          `Routes re-optimized! Score: ${scoreComparison.modified} (${deltaMsg})`,
          { duration: 5000 }
        )
      } else {
        toast.success('Routes re-optimized successfully!')
      }

      // Warn about constraint violations
      if (feasibilityWarnings?.length) {
        toast.warning(
          `Warning: ${feasibilityWarnings.length} constraint violation(s) detected`,
          { duration: 5000 }
        )
      }

      // Update solution state
      setVrpResponse(prev => ({ ...prev, data: solution }))

    } catch (error) {
      toast.dismiss()

      if (error instanceof VrpApiError) {
        toast.error(error.message)
      } else {
        toast.error('Failed to reorder job')
        console.error('Reorder error:', error)
      }
    } finally {
      setIsReordering(false)
    }
  }, [vrpRequest.data, vrpResponse.data, originalSolutionId])

  return (
    <>
      <VrpLayout
        // ... existing props
        bottomPanel={
          vrpResponse.data?.trips?.length ? (
            <VrpGantt
              requestData={vrpRequest.data as unknown as Record<string, unknown>}
              responseData={previewSolution || vrpResponse.data}  // Show preview during drag
              highlightedJob={highlightedJob}
              onJobHover={setHighlightedJob}
              onJobDragOver={handleJobDragOver}  // NEW - for evaluate preview
              onJobReorder={handleJobReorder}     // NEW - for final solve
              isReordering={isReordering}
            />
          ) : undefined
        }
      />
      {/* ... rest of component */}
    </>
  )
}

// Helper to convert reorder event to afterJobId format
function determineAfterJobId(event: JobReorderEvent): string | null {
  // If toIndex is 0, job moves to first position (after = null)
  if (event.toIndex === 0) return null

  // Otherwise, find the job currently at toIndex - 1
  // This requires trip data to determine which job is before the target position
  // Implementation depends on how trip data is structured in event
  return event.afterJobId || null  // Placeholder - need trip context
}

// Local validation before API call
function validateReorder(
  event: JobReorderEvent,
  request: Record<string, unknown>,
  solution: Vrp.OnRouteResponse | null
): { valid: boolean; error?: string } {
  if (!solution) {
    return { valid: false, error: 'No solution available' }
  }

  // Find job in request data
  const jobs = (request.jobs as any[]) || []
  const job = jobs.find(j => j.name === event.jobId)

  if (!job) {
    return { valid: false, error: 'Job not found' }
  }

  // Check if target resource is allowed for this job
  if (job.allowedResources && !job.allowedResources.includes(event.toResource)) {
    return {
      valid: false,
      error: `Job ${event.jobId} cannot be assigned to ${event.toResource}`
    }
  }

  // Find target resource's capacity
  const resources = (request.resources as any[]) || []
  const targetResource = resources.find(r => r.name === event.toResource)

  if (!targetResource) {
    return { valid: false, error: 'Target resource not found' }
  }

  // Basic capacity check (more detailed validation happens server-side)
  const targetTrip = solution.trips?.find(t => t.resource === event.toResource)
  if (targetTrip) {
    const currentLoad = targetTrip.visits?.reduce((sum, v) => {
      const visitJob = jobs.find(j => j.name === v.job)
      return sum + (visitJob?.demand || 0)
    }, 0) || 0

    if (currentLoad + (job.demand || 0) > (targetResource.capacity || Infinity)) {
      return {
        valid: false,
        error: 'Move would exceed vehicle capacity'
      }
    }
  }

  return { valid: true }
}
```

### Phase 3: Advanced Features (2-3 days)

#### 3.1 Constraint Violation Preview

Add real-time validation feedback before user drops:

**`lib/constraint-validator.ts`** (new file)

```typescript
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

export interface ConstraintViolation {
  type: 'capacity' | 'time_window' | 'skill' | 'dependency'
  severity: 'hard' | 'soft'
  message: string
  affectedJobs: string[]
}

export function validateJobMove(
  jobId: string,
  targetResource: string,
  targetIndex: number,
  request: Record<string, unknown>,
  solution: Vrp.OnRouteResponse
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = []

  // Capacity validation
  const capacityViolation = checkCapacityConstraint(
    jobId,
    targetResource,
    request,
    solution
  )
  if (capacityViolation) violations.push(capacityViolation)

  // Time window validation
  const timeWindowViolations = checkTimeWindowConstraints(
    jobId,
    targetResource,
    targetIndex,
    request,
    solution
  )
  violations.push(...timeWindowViolations)

  // Skill requirements
  const skillViolation = checkSkillConstraints(
    jobId,
    targetResource,
    request
  )
  if (skillViolation) violations.push(skillViolation)

  // Job dependencies (precedence constraints)
  const dependencyViolations = checkDependencyConstraints(
    jobId,
    targetIndex,
    request,
    solution
  )
  violations.push(...dependencyViolations)

  return violations
}

// Implementation of specific constraint checkers...
```

#### 3.2 Optimistic UI Updates

Show immediate feedback while API call is in progress:

```typescript
// In VrpExplorer.tsx
const handleJobReorder = useCallback(async (event: JobReorderEvent) => {
  // Store original solution for rollback
  const originalSolution = vrpResponse.data

  // Apply optimistic update
  const optimisticSolution = applyOptimisticReorder(originalSolution, event)
  setVrpResponse(prev => ({ ...prev, data: optimisticSolution }))
  setIsReordering(true)

  try {
    // Make API call
    const response = await fetch('/api/vrp/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalRequest: vrpRequest.data,
        originalSolution: originalSolution,
        reorderEvent: event
      })
    })

    if (!response.ok) throw new Error('Reorder failed')

    const newSolution = await response.json()

    // Replace optimistic update with real solution
    setVrpResponse(prev => ({ ...prev, data: newSolution }))
    toast.success('Routes re-optimized successfully!')

  } catch (error) {
    // Rollback to original solution on error
    setVrpResponse(prev => ({ ...prev, data: originalSolution }))
    toast.error('Failed to reorder job')
  } finally {
    setIsReordering(false)
  }
}, [vrpRequest.data, vrpResponse.data])

function applyOptimisticReorder(
  solution: Vrp.OnRouteResponse | null,
  event: JobReorderEvent
): Vrp.OnRouteResponse | null {
  if (!solution) return null

  // Clone solution
  const optimistic = structuredClone(solution)

  // Find source and target trips
  const sourceTrip = optimistic.trips?.find(t => t.resource === event.fromResource)
  const targetTrip = optimistic.trips?.find(t => t.resource === event.toResource)

  if (!sourceTrip || !targetTrip) return solution

  // Remove job from source
  const visit = sourceTrip.visits?.splice(event.fromIndex, 1)[0]
  if (!visit) return solution

  // Insert into target
  if (!targetTrip.visits) targetTrip.visits = []
  targetTrip.visits.splice(event.toIndex, 0, visit)

  // Note: This is a naive optimistic update that doesn't recalculate
  // arrival times, distances, or KPIs. The real solution from API will
  // replace this with accurate data.

  return optimistic
}
```

#### 3.3 KPI Delta Preview

Show before/after comparison during reordering:

```typescript
// In VrpKpiBar.tsx - add comparison mode
interface VrpKpiBarProps {
  responseData: Vrp.OnRouteResponse
  requestData: Record<string, unknown>
  comparisonData?: Vrp.OnRouteResponse  // NEW
  showDelta?: boolean                   // NEW
}

export function VrpKpiBar({
  responseData,
  requestData,
  comparisonData,
  showDelta = false
}: VrpKpiBarProps) {
  // Calculate KPIs for both solutions
  const currentKpis = calculateKpis(responseData, requestData)
  const previousKpis = comparisonData ? calculateKpis(comparisonData, requestData) : null

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30">
      <KpiItem
        label="Total Distance"
        value={currentKpis.totalDistance}
        previousValue={previousKpis?.totalDistance}
        showDelta={showDelta}
        format={(v) => `${v.toFixed(1)} km`}
      />
      <KpiItem
        label="Total Time"
        value={currentKpis.totalTime}
        previousValue={previousKpis?.totalTime}
        showDelta={showDelta}
        format={(v) => `${(v / 60).toFixed(1)} hrs`}
      />
      {/* Other KPIs... */}
    </div>
  )
}

function KpiItem({
  label,
  value,
  previousValue,
  showDelta,
  format
}: {
  label: string
  value: number
  previousValue?: number
  showDelta: boolean
  format: (v: number) => string
}) {
  const delta = previousValue ? value - previousValue : 0
  const percentChange = previousValue ? (delta / previousValue) * 100 : 0

  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium">{format(value)}</span>
        {showDelta && previousValue && (
          <span className={cn(
            "text-xs",
            delta > 0 ? "text-destructive" : "text-green-600"
          )}>
            {delta > 0 ? '↑' : '↓'} {Math.abs(percentChange).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}
```

## Visual Design Specifications

### Drag States

**Idle State:**
- Cursor: `cursor-grab`
- Activity block: Normal styling with hover brightness effect

**Dragging State:**
- Cursor: `cursor-grabbing`
- Active block: `opacity-50 scale-105 z-50`
- Other blocks: Normal styling, interactions disabled

**Drop Target Valid:**
- Timeline row: `bg-primary/10 border-primary border-2`
- Cursor: `cursor-grabbing`

**Drop Target Invalid:**
- Timeline row: `bg-destructive/10 border-destructive border-2`
- Cursor: `cursor-not-allowed`

**Loading State (Re-optimizing):**
- All blocks: `opacity-50 pointer-events-none`
- Cursor: `cursor-wait`
- Loading spinner overlay on Gantt chart

### Constraint Violation UI

**Warning Toast (Soft Constraint):**
```
⚠️ Warning: Capacity Warning
Moving job "Delivery-123" to Vehicle-2 will use 95% capacity.
[Cancel] [Proceed Anyway]
```

**Error Toast (Hard Constraint):**
```
❌ Invalid Move
Cannot move job "Delivery-123" to Vehicle-2:
• Exceeds vehicle capacity by 15 units
• Would violate time window at Delivery-456
[Dismiss]
```

## Accessibility Requirements

### Keyboard Navigation

- **Tab**: Focus activity blocks sequentially
- **Space**: Pick up focused block (enter drag mode)
- **Arrow Keys**: Move block left/right within timeline, up/down between resources
- **Enter**: Drop block at current position
- **Escape**: Cancel drag operation, return block to original position
- **Shift+Tab**: Reverse focus direction

### Screen Reader Announcements

- **Drag start**: "Picked up Delivery-123 from Vehicle-1, position 2"
- **Drag over**: "Moving to Vehicle-2, position 3"
- **Drop success**: "Moved Delivery-123 to Vehicle-2, position 3. Re-optimizing routes."
- **Drop invalid**: "Cannot move to this position. Exceeds vehicle capacity."
- **Reorder complete**: "Routes re-optimized. Total distance decreased by 5.2 kilometers."

### Focus Management

- Maintain focus on dragged block during operation
- After drop, focus moves to dropped block's new position
- After cancel, focus returns to original position
- During loading, focus trapped on loading indicator with "Escape to cancel" option

## Performance Considerations

### Rendering Optimization

**Problem:** Dragging can cause excessive re-renders if not optimized.

**Solutions:**
- Use `React.memo()` on activity block components
- Memoize position calculations with `useMemo()`
- Debounce drag position updates (16ms for 60fps)
- Use `requestAnimationFrame` for smooth animations
- Virtualize timeline if >50 vehicles (react-virtual)

### API Call Optimization

**Problem:** Full re-solve takes 2-5 seconds, feels slow for simple moves.

**Solutions:**
- Implement optimistic UI updates (show change immediately)
- Cache recent solutions to detect if move returns to previous state
- Debounce rapid successive moves (500ms)
- Show progress indicator with time estimate
- Allow users to "undo" during loading (cancel API call)

### Constraint Validation Performance

**Problem:** Checking constraints on every drag-over event is expensive.

**Solutions:**
- Throttle validation checks to every 100ms during drag
- Use Web Worker for complex constraint calculations
- Cache validation results for identical move patterns
- Show "Checking..." indicator during validation
- Perform deep validation only on drop, not during drag

## Error Handling

### API Errors

**Authentication Error (401):**
```
Error: API Key Invalid
The server-side API key is not configured or expired.
Please contact your administrator.
[Dismiss]
```

**Validation Error (400):**
```
Error: Invalid Route Configuration
The requested job reorder violates hard constraints:
• Job "Delivery-123" requires skill "Refrigerated" which Vehicle-2 lacks
[View Details] [Dismiss]
```

**Timeout Error (408):**
```
Error: Re-optimization Timed Out
The route is too complex to re-optimize quickly.
Try simplifying the problem or breaking it into smaller routes.
[Retry] [Dismiss]
```

**Server Error (500):**
```
Error: Server Error
An unexpected error occurred during re-optimization.
Your changes have not been saved.
[Retry] [Dismiss]
```

### Rollback Strategy

If API call fails:
1. Immediately restore original solution (already saved before optimistic update)
2. Show error toast with specific reason
3. Log detailed error to console for debugging
4. Highlight the job that was being moved (red border)
5. Provide "Retry" button if error is transient (timeout, network)

## Testing Strategy

### Unit Tests

**`__tests__/VrpGantt-reorder.test.tsx`**
- Drag-and-drop event handling
- Constraint validation logic
- Optimistic update calculations
- Rollback behavior on errors

**`__tests__/api/vrp-reorder.test.ts`**
- API endpoint request/response handling
- Sequence constraint generation
- Error responses for invalid moves

### Integration Tests

**`__tests__/e2e/job-reordering.test.tsx`**
- Full reorder workflow: drag → validate → API call → update UI
- Multi-vehicle job reassignment
- Constraint violation handling
- KPI updates after reorder

### Manual Testing Checklist

- [ ] Drag job within same vehicle route
- [ ] Drag job to different vehicle
- [ ] Drag job to invalid position (capacity violation)
- [ ] Drag job with time window constraints
- [ ] Multiple rapid drags (debouncing)
- [ ] Cancel drag with Escape key
- [ ] Keyboard-only operation (accessibility)
- [ ] Screen reader announcements
- [ ] API error handling (disconnect network during reorder)
- [ ] Loading state during re-optimization
- [ ] KPI delta preview
- [ ] Undo/redo functionality

## Implementation Timeline

### Week 1: Foundation
- **Day 1-2:** Install dnd-kit, create shadcn-compatible drag components
- **Day 3-4:** Integrate drag handlers into VrpGantt, visual feedback
- **Day 5:** Manual testing, accessibility audit

### Week 2: Backend Integration
- **Day 1-2:** Build `/api/vrp/reorder` endpoint using Solvice Change API
- **Day 3:** Integrate evaluate mode for drag preview in VrpExplorer
- **Day 4:** Integrate solve mode for final reorder on drop
- **Day 5:** Score comparison UI, feasibility warnings, error handling

### Week 3: Advanced Features
- **Day 1-2:** Optimistic UI updates with rollback
- **Day 3:** KPI delta preview during reordering
- **Day 4-5:** Comprehensive testing, bug fixes

### Week 4: Polish and Documentation
- **Day 1-2:** Performance optimization (memoization, virtualization)
- **Day 3:** Keyboard navigation refinement
- **Day 4:** User documentation and tooltips
- **Day 5:** Final testing, production deployment

## Success Metrics

### Technical Metrics
- **Drag latency:** <16ms for 60fps smoothness
- **Preview latency (evaluate):** <300ms for instant feedback during drag
- **Re-solve time (solve):** <5 seconds for typical problems (10 jobs, 3 vehicles)
- **Score accuracy:** 100% (computed by Solvice API, not estimated)
- **Error rate:** <1% of reorder operations fail

### User Experience Metrics
- **Time to first successful reorder:** <30 seconds for new users
- **Abandonment rate:** <5% of drags result in cancel/undo
- **User satisfaction:** Net Promoter Score >8/10 for reorder feature
- **Support tickets:** <10% of users require help with reordering

## Future Enhancements

### Phase 4: Batch Operations (Week 5-6)
- Select multiple jobs with Shift+Click
- Drag selection to new position
- Multi-job constraint validation
- Bulk undo/redo

### Phase 5: Smart Suggestions (Week 7-8)
- AI-powered reorder suggestions ("Try moving Delivery-123 earlier to reduce wait time")
- Highlight suboptimal job orderings with tooltips
- One-click "Apply Suggestion" button
- Integrate with VRP Assistant for natural language reordering

### Phase 6: Real-time Collaboration (Week 9-10)
- WebSocket integration for multi-user editing
- Show other users' cursors and drag operations
- Conflict resolution when multiple users reorder simultaneously
- Change history and rollback UI

## References

### External Libraries
- **@dnd-kit/core:** Core drag-and-drop functionality
- **@dnd-kit/sortable:** Sortable list utilities
- **@dnd-kit/utilities:** CSS transforms and utilities

### Solvice API Documentation
- **Sequence Constraints:** Forces specific job ordering on routes
- **Resource Constraints:** Vehicle capacity, skills, time windows
- **Optimization Objectives:** Distance, time, cost minimization

### Design References
- **shadcn/ui patterns:** Consistent styling with existing components
- **Accessible drag-and-drop:** WAI-ARIA best practices
- **Optimistic UI:** Instant feedback patterns from Figma, Linear