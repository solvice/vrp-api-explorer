'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { VrpLayout } from './VrpLayout'
import { VrpJsonEditor } from './VrpJsonEditor'
import { VrpMap } from './VrpMap'
import { VrpGantt } from './VrpGantt'
import { VrpAssistantContainer } from './VrpAssistant/VrpAssistantContainer'
import { VrpApiError } from '@/lib/vrp-api'
import { getSampleVrpData, SampleType } from '@/lib/sample-data'
import { ValidationResult } from '@/lib/vrp-schema'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { toast, Toaster } from 'sonner'

export function VrpExplorer() {
  // State management - grouped by logical concern

  // VRP Request state (input data and validation)
  const [vrpRequest, setVrpRequest] = useState({
    data: getSampleVrpData('simple'),
    sample: 'simple' as SampleType,
    validation: { valid: true, errors: [] } as ValidationResult
  })

  // VRP Response state (solution and loading)
  const [vrpResponse, setVrpResponse] = useState({
    data: null as Vrp.OnRouteResponse | null,
    isLoading: false
  })

  // Job loading state (persisted job from URL)
  const [jobState, setJobState] = useState({
    loadedJobId: null as string | null
  })

  // Highlighted job state for hover interactions between map and gantt
  const [highlightedJob, setHighlightedJob] = useState<{ resource: string; job: string } | null>(null)

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
          errorData.type || 'unknown'
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
        toast.error(error.message)

        // Handle specific error types
        switch (error.type) {
          case 'authentication':
            toast.error('Check server-side API key configuration')
            break
          case 'validation':
            toast.error('Please check your request data format')
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
        setVrpResponse(prev => ({ ...prev, data: null })) // Clear any existing solution
      }

      // Load solution if available
      if (result.solution) {
        setVrpResponse(prev => ({ ...prev, data: result.solution }))
      } else if (result.solutionError) {
        toast.info(result.solutionError)
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
          <VrpMap
            requestData={vrpRequest.data as unknown as Record<string, unknown>}
            responseData={vrpResponse.data}
            highlightedJob={highlightedJob}
            onJobHover={setHighlightedJob}
          />
        }
        bottomPanel={
          vrpResponse.data?.trips?.length ? (
            <VrpGantt
              requestData={vrpRequest.data as unknown as Record<string, unknown>}
              responseData={vrpResponse.data}
              highlightedJob={highlightedJob}
              onJobHover={setHighlightedJob}
            />
          ) : undefined
        }
      />

      <VrpAssistantContainer />

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