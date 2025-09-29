'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface LoadJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoadJob: (jobId: string) => Promise<void>
}

// UUID validation regex (accepts both formats: with and without dashes)
const UUID_REGEX = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

function validateUuid(value: string): { isValid: boolean; error?: string } {
  if (!value.trim()) {
    return { isValid: false, error: 'Job ID is required' }
  }

  if (!UUID_REGEX.test(value.trim())) {
    return { isValid: false, error: 'Invalid UUID format' }
  }

  return { isValid: true }
}

export function LoadJobDialog({ open, onOpenChange, onLoadJob }: LoadJobDialogProps) {
  const [jobId, setJobId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setJobId('')
      setError(null)
      setValidationError(null)
      setIsLoading(false)
    }
  }, [open])

  // Real-time validation
  useEffect(() => {
    if (jobId) {
      const validation = validateUuid(jobId)
      setValidationError(validation.isValid ? null : validation.error || null)
    } else {
      setValidationError(null)
    }
  }, [jobId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validateUuid(jobId)
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid job ID')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onLoadJob(jobId.trim())
      onOpenChange(false) // Close dialog on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = jobId.trim() && !validationError && !isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Load Job by ID</DialogTitle>
          <DialogDescription>
            Enter a job ID to load the VRP request and solution data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jobId">Job ID (UUID)</Label>
            <Input
              id="jobId"
              type="text"
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className={validationError ? 'border-red-500' : ''}
              disabled={isLoading}
              autoFocus
            />
            {validationError && (
              <p className="text-sm text-red-500">{validationError}</p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid}
              className="min-w-[80px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load Job'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}