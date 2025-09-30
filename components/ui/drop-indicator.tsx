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