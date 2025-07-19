import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

export type VrpApiErrorType = 
  | 'authentication' 
  | 'network' 
  | 'timeout' 
  | 'validation' 
  | 'server' 
  | 'unknown'

export class VrpApiError extends Error {
  public type: VrpApiErrorType
  public originalError?: Error

  constructor(message: string, type: VrpApiErrorType, originalError?: Error) {
    super(message)
    this.name = 'VrpApiError'
    this.type = type
    this.originalError = originalError
  }
}

export class VrpApiClient {
  private demoApiKey: string | null

  constructor(demoApiKey?: string) {
    // Get demo key from environment or parameter
    this.demoApiKey = demoApiKey || process.env.NEXT_PUBLIC_SOLVICE_API_KEY || null

    // Get effective API key (user key takes precedence)
    const effectiveApiKey = this.getUserApiKey() || this.demoApiKey

    if (!effectiveApiKey) {
      throw new Error('No API key available. Set SOLVICE_API_KEY environment variable or provide user API key.')
    }
  }

  /**
   * Set user API key and store in localStorage
   */
  setUserApiKey(apiKey: string | null): void {
    if (apiKey) {
      localStorage.setItem('vrp_user_api_key', apiKey)
    } else {
      localStorage.removeItem('vrp_user_api_key')
    }
  }

  /**
   * Get user API key from localStorage
   */
  getUserApiKey(): string | null {
    if (typeof window === 'undefined') {
      return null // SSR safety
    }
    return localStorage.getItem('vrp_user_api_key')
  }

  /**
   * Check if currently using demo API key
   */
  isUsingDemoKey(): boolean {
    return !this.getUserApiKey() && !!this.demoApiKey
  }

  /**
   * Get effective API key for requests
   */
  private getEffectiveApiKey(): string {
    return this.getUserApiKey() || this.demoApiKey || ''
  }

  /**
   * Check if API key is valid by making a test request
   */
  async checkAuth(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Make a minimal test request to validate the API key
      const testRequest: Vrp.VrpSyncSolveParams = {
        jobs: [{
          name: "test-job",
          duration: 900,
          location: { latitude: 52.5200, longitude: 13.4050 }
        }],
        resources: [{
          name: "test-vehicle",
          shifts: [{
            from: '2024-01-15T08:00:00Z',
            to: '2024-01-15T18:00:00Z'
          }]
        }]
      }
      
      await this.solveVrp(testRequest)
      return { valid: true }
    } catch (error) {
      const vrpError = error instanceof VrpApiError ? error : this.mapError(error as Error)
      return { 
        valid: false, 
        error: vrpError.type === 'authentication' ? 'Invalid API key' : vrpError.message 
      }
    }
  }

  /**
   * Solve VRP problem using local API route
   */
  async solveVrp(request: Vrp.VrpSyncSolveParams): Promise<Vrp.OnRouteResponse> {
    try {
      const response = await fetch('/api/vrp/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getEffectiveApiKey()}`
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new VrpApiError(
          errorData.error || 'Request failed',
          errorData.type || 'unknown'
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof VrpApiError) {
        throw error
      }
      // Map other errors
      const vrpError = this.mapError(error as Error)
      throw vrpError
    }
  }

  /**
   * Map native errors to VrpApiError with appropriate types
   */
  private mapError(error: Error): VrpApiError {
    const message = error.message.toLowerCase()

    // Authentication errors
    if (error.name === 'AuthenticationError' || message.includes('unauthorized') || message.includes('authentication')) {
      return new VrpApiError(
        'Invalid API key. Please check your API key and try again.',
        'authentication',
        error
      )
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return new VrpApiError(
        'Network error. Please check your internet connection and try again.',
        'network',
        error
      )
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('abort')) {
      return new VrpApiError(
        'Request timed out. The VRP problem might be too complex or the server is busy.',
        'timeout',
        error
      )
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || error.name === 'BadRequestError') {
      return new VrpApiError(
        'Invalid request data. Please check your VRP problem definition.',
        'validation',
        error
      )
    }

    // Server errors
    if (message.includes('server') || message.includes('500') || error.name === 'InternalServerError') {
      return new VrpApiError(
        'Server error. Please try again later.',
        'server',
        error
      )
    }

    // Unknown errors
    return new VrpApiError(
      `Unexpected error: ${error.message}`,
      'unknown',
      error
    )
  }

  /**
   * Get current API key status for UI display
   */
  getApiKeyStatus(): { type: 'demo' | 'user', masked: string } {
    const userKey = this.getUserApiKey()
    if (userKey) {
      return {
        type: 'user',
        masked: `${userKey.substring(0, 8)}...${userKey.substring(userKey.length - 4)}`
      }
    }
    
    if (this.demoApiKey) {
      return {
        type: 'demo',
        masked: 'Demo Key'
      }
    }

    throw new Error('No API key configured')
  }
}