import { useSortable } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'

interface SortableItemProps {
  id: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
  data?: Record<string, unknown>
}

export function SortableItem({ id, children, disabled, className, data }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({ id, disabled, data })

  // For Gantt charts with absolute positioning, we can't apply transforms
  // Instead, we just attach the drag handlers and let the child handle positioning
  return (
    <div
      ref={setNodeRef}
      className={cn(
        isDragging && "opacity-0 z-50",
        !disabled && "cursor-grab",
        isDragging && "cursor-grabbing",
        className
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}