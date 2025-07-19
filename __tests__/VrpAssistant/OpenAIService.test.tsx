import { OpenAIService } from '@/components/VrpAssistant/OpenAIService'

// Mock fetch globally
global.fetch = jest.fn()

describe('OpenAIService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear any environment variables
    delete process.env.NEXT_PUBLIC_OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
  })

  describe('initialization', () => {
    it('initializes with provided API key', () => {
      const service = new OpenAIService('test-api-key')
      expect(service).toBeInstanceOf(OpenAIService)
    })

    it('initializes with environment variable API key', () => {
      process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'env-api-key'
      const service = new OpenAIService()
      expect(service).toBeInstanceOf(OpenAIService)
    })

    it('initializes with OPENAI_API_KEY environment variable', () => {
      process.env.OPENAI_API_KEY = 'env-api-key'
      const service = new OpenAIService()
      expect(service).toBeInstanceOf(OpenAIService)
    })

    it('throws error when no API key is provided', () => {
      expect(() => new OpenAIService()).toThrow('OpenAI API key is required')
    })

    it('throws error when empty API key is provided', () => {
      expect(() => new OpenAIService('')).toThrow('OpenAI API key is required')
    })
  })

  describe('API calls', () => {
    let service: OpenAIService

    beforeEach(() => {
      service = new OpenAIService('test-api-key')
    })

    it('makes successful API call', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test response from OpenAI'
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.sendMessage('Test message')
      
      expect(result).toBe('Test response from OpenAI')
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('includes correct message format in API call', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await service.sendMessage('Test message')

      const callArgs = (fetch as jest.Mock).mock.calls[0][1]
      const body = JSON.parse(callArgs.body)
      
      expect(body.messages).toEqual([
        {
          role: 'user',
          content: 'Test message'
        }
      ])
      expect(body.model).toBe('gpt-4')
      expect(body.max_tokens).toBe(1000)
      expect(body.temperature).toBe(0.7)
    })

    it('handles API error responses', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect(service.sendMessage('Test message'))
        .rejects.toThrow('OpenAI API error: 401 Unauthorized')
    })

    it('handles network errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(service.sendMessage('Test message'))
        .rejects.toThrow('Network error')
    })

    it('handles malformed API responses', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      })

      await expect(service.sendMessage('Test message'))
        .rejects.toThrow('Invalid response format from OpenAI API')
    })
  })

  describe('retry logic', () => {
    let service: OpenAIService

    beforeEach(() => {
      service = new OpenAIService('test-api-key')
    })

    it('retries on rate limit errors', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Success after retry' } }]
      }

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        })

      const result = await service.sendMessage('Test message')
      
      expect(result).toBe('Success after retry')
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('retries on server errors', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Success after retry' } }]
      }

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        })

      const result = await service.sendMessage('Test message')
      
      expect(result).toBe('Success after retry')
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('fails after maximum retries', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(service.sendMessage('Test message'))
        .rejects.toThrow('OpenAI API error: 500 Internal Server Error')
      
      expect(fetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('does not retry on client errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      await expect(service.sendMessage('Test message'))
        .rejects.toThrow('OpenAI API error: 400 Bad Request')
      
      expect(fetch).toHaveBeenCalledTimes(1) // No retries for 4xx errors
    })
  })

  describe('API key validation', () => {
    it('validates API key format', () => {
      expect(() => new OpenAIService('invalid-key')).not.toThrow()
      expect(() => new OpenAIService('sk-test123')).not.toThrow()
    })

    it('handles API key authentication errors', async () => {
      const service = new OpenAIService('invalid-api-key')

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect(service.sendMessage('Test message'))
        .rejects.toThrow('OpenAI API error: 401 Unauthorized')
    })
  })
})