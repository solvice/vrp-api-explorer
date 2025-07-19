'use client'

import { useState, useCallback } from 'react'
import { VrpLayout } from './VrpLayout'
import { VrpJsonEditor } from './VrpJsonEditor'
import { VrpMap } from './VrpMap'
import { VrpApiError } from '@/lib/vrp-api'
import { getSampleVrpData, SampleType } from '@/lib/sample-data'
import { ValidationResult } from '@/lib/vrp-schema'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { toast, Toaster } from 'sonner'

export function VrpExplorer() {
  // State management
  const [currentSample, setCurrentSample] = useState<SampleType>('simple')
  const [requestData, setRequestData] = useState(() => getSampleVrpData('simple'))
  const [responseData, setResponseData] = useState<Vrp.OnRouteResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult>({ valid: true, errors: [] })
  // API status - always configured since keys are server-side
  const [apiKeyStatus] = useState<{ type: 'demo' | 'user', masked: string }>({ 
    type: 'user', 
    masked: 'Configured (Server-side)' 
  })

  // Handle API key changes - now just a placeholder since keys are server-side
  const handleApiKeyChange = useCallback(async () => {
    // API keys are now configured server-side only
    toast.info('API keys are configured server-side. Please set environment variables in your deployment.')
  }, [])

  // Handle VRP solving
  const handleSolve = useCallback(async () => {
    if (!validationResult.valid) {
      toast.error('Please fix validation errors before sending')
      return
    }

    setIsLoading(true)
    setResponseData(null)

    try {
      const toastId = toast.loading('Solving VRP problem...')
      
      // Make direct API call to our server-side route
      const response = await fetch('/api/vrp/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
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
      
      setResponseData(result)
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
      setIsLoading(false)
    }
  }, [requestData, validationResult.valid])

  // Handle request data changes
  const handleRequestChange = useCallback((newRequestData: Record<string, unknown>) => {
    console.log('🗺️ VrpExplorer: Request data changed, updating map...', {
      hasJobs: Array.isArray((newRequestData as Record<string, unknown>)?.jobs),
      jobCount: Array.isArray((newRequestData as Record<string, unknown>)?.jobs) ? ((newRequestData as Record<string, unknown>).jobs as unknown[]).length : 0,
      hasResources: Array.isArray((newRequestData as Record<string, unknown>)?.resources),
      resourceCount: Array.isArray((newRequestData as Record<string, unknown>)?.resources) ? ((newRequestData as Record<string, unknown>).resources as unknown[]).length : 0
    })
    setRequestData(newRequestData as unknown as Vrp.VrpSyncSolveParams)
    // Clear response when request changes
    setResponseData(null)
  }, [])

  // Handle validation changes
  const handleValidationChange = useCallback((result: ValidationResult) => {
    setValidationResult(result)
  }, [])

  // Handle sample changes
  const handleSampleChange = useCallback((sample: SampleType) => {
    setCurrentSample(sample)
    // Clear response when changing samples
    setResponseData(null)
  }, [])


  return (
    <>
      <VrpLayout
        leftPanel={
          <VrpJsonEditor
            requestData={requestData as unknown as Record<string, unknown>}
            responseData={responseData}
            onChange={handleRequestChange}
            onValidationChange={handleValidationChange}
            isLoading={isLoading}
            onSend={handleSolve}
            disabled={false}
            apiKeyStatus={apiKeyStatus}
            onApiKeyChange={handleApiKeyChange}
            currentSample={currentSample}
            onSampleChange={handleSampleChange}
          />
        }
        rightPanel={
          <VrpMap
            requestData={requestData as unknown as Record<string, unknown>}
            responseData={responseData}
          />
        }
      />
      
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