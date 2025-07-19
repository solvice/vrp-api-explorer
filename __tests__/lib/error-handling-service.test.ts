import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/lib/error-handling-service'

describe('ErrorHandlingService', () => {
  describe('classifyError', () => {
    test('should classify API key errors correctly', () => {
      const error = new Error('API key is invalid')
      const classified = ErrorHandlingService.classifyError(error)
      
      expect(classified.type).toBe(ErrorType.API_KEY)
      expect(classified.severity).toBe(ErrorSeverity.HIGH)
      expect(classified.retryable).toBe(false)
      expect(classified.userMessage).toContain('API key')
      expect(classified.suggestions).toContain('Verify your OpenAI API key is set correctly')
    })

    test('should classify rate limit errors correctly', () => {
      const error = new Error('Rate limit exceeded')
      const classified = ErrorHandlingService.classifyError(error)
      
      expect(classified.type).toBe(ErrorType.RATE_LIMIT)
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM)
      expect(classified.retryable).toBe(true)
      expect(classified.userMessage).toContain('Rate limit')
    })

    test('should classify network errors correctly', () => {
      const error = new Error('Network connection failed')
      const classified = ErrorHandlingService.classifyError(error)
      
      expect(classified.type).toBe(ErrorType.NETWORK)
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM)
      expect(classified.retryable).toBe(true)
      expect(classified.suggestions).toContain('Check your internet connection')
    })

    test('should classify HTTP errors correctly', () => {
      const error = { status: 500 }
      const classified = ErrorHandlingService.classifyError(error)
      
      expect(classified.type).toBe(ErrorType.SERVICE_UNAVAILABLE)
      expect(classified.severity).toBe(ErrorSeverity.HIGH)
      expect(classified.retryable).toBe(true)
      expect(classified.code).toBe(500)
    })

    test('should handle unknown errors', () => {
      const error = new Error('Something unexpected happened')
      const classified = ErrorHandlingService.classifyError(error)
      
      expect(classified.type).toBe(ErrorType.UNKNOWN)
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM)
      expect(classified.retryable).toBe(true)
    })
  })

  describe('withRetry', () => {
    test('should retry on retryable errors', async () => {
      let attempts = 0
      const operation = jest.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          throw new Error('Network connection failed')
        }
        return 'success'
      })

      const result = await ErrorHandlingService.withRetry(operation, {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 1.5,
        retryableErrors: [ErrorType.NETWORK]
      })

      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })

    test('should not retry on non-retryable errors', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new Error('API key is invalid')
      })

      await expect(ErrorHandlingService.withRetry(operation)).rejects.toMatchObject({
        type: ErrorType.API_KEY,
        retryable: false
      })

      expect(operation).toHaveBeenCalledTimes(1)
    })
  })

  describe('formatUserError', () => {
    test('should format error with suggestions', () => {
      const error = ErrorHandlingService.classifyError(new Error('API key is invalid'))
      const formatted = ErrorHandlingService.formatUserError(error)
      
      expect(formatted).toContain('API key is missing or invalid')
      expect(formatted).toContain('Suggestions:')
      expect(formatted).toContain('1. Verify your OpenAI API key')
    })
  })
})