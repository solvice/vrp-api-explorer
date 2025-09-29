'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface LoadJobButtonProps {
  onClick: () => void
  disabled?: boolean
}

export function LoadJobButton({ onClick, disabled = false }: LoadJobButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onClick}
          disabled={disabled}
          aria-label="Load Job"
        >
          <Download className="h-3 w-3" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Load Job by ID</p>
      </TooltipContent>
    </Tooltip>
  )
}