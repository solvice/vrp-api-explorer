'use client'

import { useState, useEffect, useCallback } from 'react'
import { VrpLayout } from './VrpLayout'
import { VrpJsonEditor } from './VrpJsonEditor'
import { VrpMap } from './VrpMap'
import { VrpApiClient, VrpApiError } from '@/lib/vrp-api'
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
  const [apiClient] = useState(() => {
    try {
      return new VrpApiClient()
    } catch {
      // If no API key available, still create client for demo
      console.warn('No API key available')
      return null
    }
  })

  // Get API key status for header
  const getApiKeyStatus = useCallback(() => {
    if (!apiClient) {
      return { type: 'demo' as const, masked: 'No API Key' }
    }
    try {
      return apiClient.getApiKeyStatus()
    } catch {
      return { type: 'demo' as const, masked: 'No API Key' }
    }
  }, [apiClient])

  const [apiKeyStatus, setApiKeyStatus] = useState<{ type: 'demo' | 'user', masked: string }>({ type: 'demo', masked: 'No API Key' })
  const [authStatus, setAuthStatus] = useState<{ checked: boolean; valid: boolean; error?: string }>({ checked: false, valid: false })

  // Update API key status when client changes
  useEffect(() => {
    setApiKeyStatus(getApiKeyStatus())
  }, [getApiKeyStatus])

  // Check authentication when API client is available
  useEffect(() => {
    if (apiClient && !authStatus.checked) {
      const checkAuth = async () => {
        try {
          const result = await apiClient.checkAuth()
          setAuthStatus({ checked: true, valid: result.valid, error: result.error })
          if (!result.valid) {
            toast.error(`Authentication failed: ${result.error}`)
          }
        } catch {
          setAuthStatus({ checked: true, valid: false, error: 'Auth check failed' })
          toast.error('Failed to verify API key')
        }
      }
      checkAuth()
    }
  }, [apiClient, authStatus.checked])

  // Handle API key changes
  const handleApiKeyChange = useCallback(async (newApiKey: string | null) => {
    if (!apiClient) return
    
    try {
      apiClient.setUserApiKey(newApiKey)
      setApiKeyStatus(getApiKeyStatus())
      setAuthStatus({ checked: false, valid: false }) // Reset auth status
      
      // Re-check authentication with new key
      const result = await apiClient.checkAuth()
      setAuthStatus({ checked: true, valid: result.valid, error: result.error })
      
      if (result.valid) {
        toast.success(newApiKey ? 'API key updated and verified' : 'Switched to demo key')
      } else {
        toast.error(`API key failed verification: ${result.error}`)
      }
    } catch {
      toast.error('Failed to update API key')
      setAuthStatus({ checked: true, valid: false, error: 'Update failed' })
    }
  }, [apiClient, getApiKeyStatus])

  // Handle VRP solving
  const handleSolve = useCallback(async () => {
    if (!apiClient) {
      toast.error('No API client available')
      return
    }

    if (!validationResult.valid) {
      toast.error('Please fix validation errors before sending')
      return
    }

    setIsLoading(true)
    setResponseData(null)

    try {
      const toastId = toast.loading('Solving VRP problem...')
      
      const response = await apiClient.solveVrp(requestData)
      
      toast.dismiss(toastId)
      toast.success('VRP problem solved successfully!')
      
      setResponseData(response)
    } catch (error) {
      toast.dismiss()
      
      if (error instanceof VrpApiError) {
        toast.error(error.message)
        
        // Handle specific error types
        switch (error.type) {
          case 'authentication':
            toast.error('Please check your API key in the header')
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
  }, [apiClient, requestData, validationResult.valid])

  // Handle request data changes
  const handleRequestChange = useCallback((newRequestData: Record<string, unknown>) => {
    console.log('🗺️ VrpExplorer: Request data changed, updating map...', {
      hasJobs: Array.isArray((newRequestData as any)?.jobs),
      jobCount: (newRequestData as any)?.jobs?.length,
      hasResources: Array.isArray((newRequestData as any)?.resources),
      resourceCount: (newRequestData as any)?.resources?.length
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