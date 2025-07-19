/**
 * Comprehensive error handling service for VRP AI operations
 */

export enum ErrorType {
  NETWORK = 'network',
  API_KEY = 'api_key',
  RATE_LIMIT = 'rate_limit',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  QUOTA_EXCEEDED = 'quota_exceeded',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface VrpError {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  userMessage: string
  code?: string | number
  retryable: boolean
  retryAfter?: number // seconds
  suggestions: string[]
  originalError?: unknown
  timestamp: Date
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
  retryableErrors: ErrorType[]
}

export class ErrorHandlingService {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      ErrorType.NETWORK,
      ErrorType.RATE_LIMIT,
      ErrorType.TIMEOUT,
      ErrorType.SERVICE_UNAVAILABLE
    ]
  }

  /**
   * Classify and enhance an error with detailed information
   */
  static classifyError(error: unknown): VrpError {
    const timestamp = new Date()

    // Handle known error types
    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      // API Key errors
      if (message.includes('api key') || message.includes('unauthorized') || message.includes('authentication')) {
        return {
          type: ErrorType.API_KEY,
          severity: ErrorSeverity.HIGH,
          message: error.message,
          userMessage: 'API key is missing or invalid. Please check your OpenAI configuration.',
          retryable: false,
          suggestions: [
            'Verify your OpenAI API key is set correctly',
            'Check if your API key has the required permissions',
            'Ensure the API key hasn\'t expired'
          ],
          originalError: error,
          timestamp
        }
      }

      // Rate limit errors
      if (message.includes('rate limit') || message.includes('too many requests')) {
        const retryAfter = this.extractRetryAfter(error.message)
        return {
          type: ErrorType.RATE_LIMIT,
          severity: ErrorSeverity.MEDIUM,
          message: error.message,
          userMessage: 'Rate limit exceeded. Please wait a moment before trying again.',
          retryable: true,
          retryAfter,
          suggestions: [
            'Wait a few seconds and try again',
            'Consider upgrading your OpenAI plan for higher limits',
            'Break down complex requests into smaller parts'
          ],
          originalError: error,
          timestamp
        }
      }

      // Network errors
      if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
        return {
          type: ErrorType.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          message: error.message,
          userMessage: 'Network error occurred. Please check your internet connection.',
          retryable: true,
          suggestions: [
            'Check your internet connection',
            'Try again in a few moments',
            'Contact support if the issue persists'
          ],
          originalError: error,
          timestamp
        }
      }

      // Timeout errors
      if (message.includes('timeout') || message.includes('timed out')) {
        return {
          type: ErrorType.TIMEOUT,
          severity: ErrorSeverity.MEDIUM,
          message: error.message,
          userMessage: 'Request timed out. The operation took too long to complete.',
          retryable: true,
          suggestions: [
            'Try simplifying your request',
            'Break down complex modifications into smaller steps',
            'Try again with a more specific request'
          ],
          originalError: error,
          timestamp
        }
      }

      // Validation errors
      if (message.includes('validation') || message.includes('invalid') || message.includes('schema')) {
        return {
          type: ErrorType.VALIDATION,
          severity: ErrorSeverity.HIGH,
          message: error.message,
          userMessage: 'The request contains invalid data or doesn\'t match the expected format.',
          retryable: false,
          suggestions: [
            'Check that your VRP data is properly formatted',
            'Try rephrasing your request more clearly',
            'Ensure all required fields are present'
          ],
          originalError: error,
          timestamp
        }
      }

      // Quota exceeded
      if (message.includes('quota') || message.includes('limit exceeded')) {
        return {
          type: ErrorType.QUOTA_EXCEEDED,
          severity: ErrorSeverity.HIGH,
          message: error.message,
          userMessage: 'API quota exceeded. You\'ve reached your usage limit.',
          retryable: false,
          suggestions: [
            'Check your OpenAI usage dashboard',
            'Consider upgrading your plan',
            'Wait until your quota resets'
          ],
          originalError: error,
          timestamp
        }
      }
    }

    // Handle HTTP response errors
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: number }).status

      if (status === 429) {
        return {
          type: ErrorType.RATE_LIMIT,
          severity: ErrorSeverity.MEDIUM,
          message: 'Rate limit exceeded',
          userMessage: 'Too many requests. Please wait a moment.',
          code: status,
          retryable: true,
          retryAfter: 60,
          suggestions: ['Wait a minute and try again'],
          originalError: error,
          timestamp
        }
      }

      if (status >= 500) {
        return {
          type: ErrorType.SERVICE_UNAVAILABLE,
          severity: ErrorSeverity.HIGH,
          message: 'Service temporarily unavailable',
          userMessage: 'The AI service is temporarily unavailable. Please try again later.',
          code: status,
          retryable: true,
          suggestions: [
            'Try again in a few minutes',
            'Check the OpenAI status page',
            'Contact support if the issue persists'
          ],
          originalError: error,
          timestamp
        }
      }
    }

    // Unknown error fallback
    return {
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
      retryable: true,
      suggestions: [
        'Try again with a different request',
        'Refresh the page and try again',
        'Contact support if the issue continues'
      ],
      originalError: error,
      timestamp
    }
  }

  /**
   * Execute an operation with automatic retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config }
    let lastError: VrpError | null = null

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = this.classifyError(error)

        // Don't retry if error is not retryable
        if (!lastError.retryable || !retryConfig.retryableErrors.includes(lastError.type)) {
          throw lastError
        }

        // Don't retry on last attempt
        if (attempt === retryConfig.maxRetries) {
          throw lastError
        }

        // Calculate delay for next attempt
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelay
        )

        // Use retryAfter if provided by the error
        const waitTime = lastError.retryAfter ? lastError.retryAfter * 1000 : delay

        console.warn(`Retry attempt ${attempt + 1}/${retryConfig.maxRetries} after ${waitTime}ms`, {
          error: lastError.type,
          message: lastError.message
        })

        await this.delay(waitTime)
      }
    }

    throw lastError
  }

  /**
   * Extract retry-after value from error message
   */
  private static extractRetryAfter(message: string): number | undefined {
    const match = message.match(/retry(?:\s+after)?\s+(\d+)/i)
    return match ? parseInt(match[1], 10) : undefined
  }

  /**
   * Delay helper for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Generate user-friendly error message with suggestions
   */
  static formatUserError(error: VrpError): string {
    let message = error.userMessage

    if (error.suggestions.length > 0) {
      message += '\n\nSuggestions:'
      error.suggestions.forEach((suggestion, index) => {
        message += `\n${index + 1}. ${suggestion}`
      })
    }

    if (error.retryable) {
      message += '\n\nThis operation can be retried.'
    }

    return message
  }

  /**
   * Log error for debugging and monitoring
   */
  static logError(error: VrpError, context?: Record<string, unknown>): void {
    const logData = {
      type: error.type,
      severity: error.severity,
      message: error.message,
      userMessage: error.userMessage,
      retryable: error.retryable,
      timestamp: error.timestamp,
      context
    }

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error('VRP Error:', logData)
        break
      case ErrorSeverity.MEDIUM:
        console.warn('VRP Warning:', logData)
        break
      case ErrorSeverity.LOW:
        console.info('VRP Info:', logData)
        break
    }
  }
}