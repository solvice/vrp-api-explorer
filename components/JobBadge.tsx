'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface JobBadgeProps {
  jobId: string
  onClear: () => void
}

export function JobBadge({ jobId, onClear }: JobBadgeProps) {
  // Format jobId for display - show first 8 characters with "..."
  const displayJobId = jobId.length > 12 ? `${jobId.slice(0, 8)}...` : jobId

  return (
    <div className="flex items-center space-x-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="text-xs font-mono">
            {displayJobId}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Loaded Job: {jobId}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-red-100 hover:text-red-600"
            onClick={onClear}
            aria-label="Clear loaded job"
          >
            <X className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Clear loaded job</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}