'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { VrpLayout } from './VrpLayout'
import { VrpJsonEditor } from './VrpJsonEditor'
import { VrpMapAdaptive } from './VrpMapAdaptive'
import { VrpGantt, JobReorderEvent } from './VrpGantt'
import { VrpKpiBar } from './VrpKpiBar'
import { VrpAssistantContainer } from './VrpAssistant/VrpAssistantContainer'
import { VrpApiError } from '@/lib/vrp-api'
import { getSampleVrpData, SampleType } from '@/lib/sample-data'
import { ValidationResult } from '@/lib/vrp-schema'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { JobExplanationResponse } from 'solvice-vrp-solver/resources/vrp/jobs'
import { toast, Toaster } from 'sonner'

interface VrpExplorerProps {
  enableAiAssistant?: boolean
}

export function VrpExplorer({ enableAiAssistant = true }: VrpExplorerProps) {
  // State management - grouped by logical concern

  // VRP Request state (input data and validation)
  const [vrpRequest, setVrpRequest] = useState({
    data: getSampleVrpData('simple'),
    sample: 'simple' as SampleType,
    validation: { valid: true, errors: [] } as ValidationResult
  })

  // VRP Response state (solution, explanation, and loading)
  const [vrpResponse, setVrpResponse] = useState({
    data: null as Vrp.OnRouteResponse | null,
    explanation: null as JobExplanationResponse | null,
    isLoading: false
  })

  // Job loading state (persisted job from URL)
  const [jobState, setJobState] = useState({
    loadedJobId: null as string | null
  })

  // Highlighted job state for hover interactions between map and gantt
  const [highlightedJob, setHighlightedJob] = useState<{ resource: string; job: string } | null>(null)

  // Reordering state
  const [isReordering, setIsReordering] = useState(false)

  // API status - always configured since keys are server-side
  const apiKeyStatus = {
    type: 'user' as const,
    masked: 'Configured (Server-side)'
  }

  // URL parameter handling
  const searchParams = useSearchParams()
  const router = useRouter()

  // Handle API key changes - now just a placeholder since keys are server-side
  const handleApiKeyChange = useCallback(async () => {
    // API keys are now configured server-side only
    toast.info('API keys are configured server-side. Please set environment variables in your deployment.')
  }, [])

  // Handle VRP solving
  const handleSolve = useCallback(async () => {
    if (!vrpRequest.validation.valid) {
      toast.error('Please fix validation errors before sending')
      return
    }

    setVrpResponse(prev => ({ ...prev, isLoading: true, data: null }))

    try {
      const toastId = toast.loading('Solving VRP problem...')

      // Make direct API call to our server-side route
      const response = await fetch('/api/vrp/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vrpRequest.data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new VrpApiError(
          errorData.error || 'Request failed',
          errorData.type || 'unknown',
          undefined,
          errorData.details
        )
      }

      const result = await response.json()

      toast.dismiss(toastId)
      toast.success('VRP problem solved successfully!')

      console.log('🚀 VRP API Response received:', result)
      console.log('🚀 Response trips:', result.trips)
      if (result.trips?.[0]) {
        console.log('🚀 First trip:', result.trips[0])
        console.log('🚀 First trip polyline:', result.trips[0].polyline)
      }

      setVrpResponse(prev => ({ ...prev, data: result }))
    } catch (error) {
      toast.dismiss()

      if (error instanceof VrpApiError) {
        // Format error message with details
        let errorMessage = error.message

        if (error.details?.errors && error.details.errors.length > 0) {
          errorMessage += ':\n' + error.details.errors.map(e => `• ${e}`).join('\n')
        }

        toast.error(errorMessage, {
          duration: 8000,
          style: { whiteSpace: 'pre-line' }
        })

        // Show warnings if present
        if (error.details?.warnings && error.details.warnings.length > 0) {
          error.details.warnings.forEach(warning => {
            toast.warning(warning, { duration: 6000 })
          })
        }

        // Handle specific error types with additional context
        switch (error.type) {
          case 'authentication':
            toast.error('Check server-side API key configuration')
            break
          case 'validation':
            if (!error.details?.errors?.length) {
              toast.error('Please check your request data format')
            }
            break
          case 'network':
            toast.error('Please check your internet connection')
            break
          case 'timeout':
            toast.error('Try simplifying your VRP problem')
            break
        }
      } else {
        toast.error('An unexpected error occurred')
        console.error('VRP solving error:', error)
      }
    } finally {
      setVrpResponse(prev => ({ ...prev, isLoading: false }))
    }
  }, [vrpRequest.data, vrpRequest.validation.valid])

  // Handle request data changes
  const handleRequestChange = useCallback((newRequestData: Record<string, unknown>) => {
    console.log('🗺️ VrpExplorer: Request data changed, updating map...', {
      hasJobs: Array.isArray((newRequestData as Record<string, unknown>)?.jobs),
      jobCount: Array.isArray((newRequestData as Record<string, unknown>)?.jobs) ? ((newRequestData as Record<string, unknown>).jobs as unknown[]).length : 0,
      hasResources: Array.isArray((newRequestData as Record<string, unknown>)?.resources),
      resourceCount: Array.isArray((newRequestData as Record<string, unknown>)?.resources) ? ((newRequestData as Record<string, unknown>).resources as unknown[]).length : 0
    })
    setVrpRequest(prev => ({ ...prev, data: newRequestData as unknown as Vrp.VrpSyncSolveParams }))
    // Clear response when request changes
    setVrpResponse(prev => ({ ...prev, data: null }))
  }, [])

  // Handle validation changes
  const handleValidationChange = useCallback((result: ValidationResult) => {
    setVrpRequest(prev => ({ ...prev, validation: result }))
  }, [])

  // Handle sample changes
  const handleSampleChange = useCallback((sample: SampleType) => {
    setVrpRequest(prev => ({ ...prev, sample }))
    // Clear response when changing samples
    setVrpResponse(prev => ({ ...prev, data: null }))
  }, [])

  // Handle job loading
  const handleLoadJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/vrp/load/${jobId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load job')
      }

      const result = await response.json()

      // Replace request data
      if (result.request) {
        setVrpRequest(prev => ({ ...prev, data: result.request }))
        setVrpResponse(prev => ({ ...prev, data: null, explanation: null })) // Clear any existing solution and explanation
      }

      // Load solution if available
      if (result.solution) {
        setVrpResponse(prev => ({ ...prev, data: result.solution }))
      } else if (result.solutionError) {
        toast.info(result.solutionError)
      }

      // Load explanation if available
      if (result.explanation) {
        setVrpResponse(prev => ({ ...prev, explanation: result.explanation }))
      } else if (result.explanationError) {
        console.info('Explanation:', result.explanationError)
      }

      // Update URL and state
      setJobState({ loadedJobId: jobId })
      router.push(`/?run=${jobId}`, { scroll: false })

      toast.success('Job loaded successfully!')
    } catch (error) {
      throw error // Re-throw for dialog error handling
    }
  }, [router])

  // Handle clearing loaded job
  const handleClearJob = useCallback(() => {
    setJobState({ loadedJobId: null })
    router.push('/', { scroll: false })
    toast.info('Cleared loaded job')
  }, [router])

  // Auto-load job from URL parameter
  useEffect(() => {
    const runParam = searchParams.get('run')
    if (runParam && runParam !== jobState.loadedJobId) {
      handleLoadJob(runParam).catch(error => {
        console.error('Failed to auto-load job:', error)
        toast.error('Failed to load job from URL')
        // Clear invalid URL parameter
        router.push('/', { scroll: false })
      })
    }
  }, [searchParams, jobState.loadedJobId, handleLoadJob, router])

  // Handle job reordering with Solvice Change API
  const handleJobReorder = useCallback(async (event: JobReorderEvent) => {
    console.log('Job reorder requested:', event)

    const originalSolutionId = vrpResponse.data?.id

    if (!originalSolutionId) {
      toast.error('No solution ID available for reordering')
      return
    }

    setIsReordering(true)

    try {
      const toastId = toast.loading('Re-optimizing routes...')

      // Call Change API in solve mode for full re-optimization
      const response = await fetch('/api/vrp/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: event.jobId,
          afterJobId: event.afterJobId,
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

      // Show score comparison if available
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
  }, [vrpResponse.data])

  return (
    <>
      <VrpLayout
        leftPanelSize={35}
        leftPanel={
          <VrpJsonEditor
            requestData={vrpRequest.data as unknown as Record<string, unknown>}
            responseData={vrpResponse.data}
            onChange={handleRequestChange}
            onValidationChange={handleValidationChange}
            isLoading={vrpResponse.isLoading}
            onSend={handleSolve}
            disabled={false}
            apiKeyStatus={apiKeyStatus}
            onApiKeyChange={handleApiKeyChange}
            currentSample={vrpRequest.sample}
            onSampleChange={handleSampleChange}
            loadedJobId={jobState.loadedJobId}
            onLoadJob={handleLoadJob}
            onClearJob={handleClearJob}
          />
        }
        centerPanel={
          <VrpMapAdaptive
            requestData={vrpRequest.data as unknown as Record<string, unknown>}
            responseData={vrpResponse.data}
            highlightedJob={highlightedJob}
            onJobHover={setHighlightedJob}
          />
        }
        kpiBar={
          vrpResponse.data ? (
            <VrpKpiBar
              responseData={vrpResponse.data}
              requestData={vrpRequest.data as unknown as Record<string, unknown>}
              explanation={vrpResponse.explanation}
            />
          ) : undefined
        }
        bottomPanel={
          vrpResponse.data?.trips?.length ? (
            <VrpGantt
              requestData={vrpRequest.data as unknown as Record<string, unknown>}
              responseData={vrpResponse.data}
              highlightedJob={highlightedJob}
              onJobHover={setHighlightedJob}
              onJobReorder={handleJobReorder}
              isReordering={isReordering}
            />
          ) : undefined
        }
      />

      {enableAiAssistant && <VrpAssistantContainer />}

      <Toaster
        position="bottom-right"
        closeButton
        richColors
        expand={false}
        visibleToasts={3}
      />
    </>
  )
}