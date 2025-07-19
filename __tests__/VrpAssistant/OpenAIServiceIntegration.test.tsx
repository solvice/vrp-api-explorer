import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShadcnChatInterface } from '@/components/VrpAssistant/ShadcnChatInterface'
import { VrpAssistantProvider } from '@/components/VrpAssistant/VrpAssistantContext'
import { OpenAIService } from '@/components/VrpAssistant/OpenAIService'

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock fetch
global.fetch = jest.fn()

// Import OpenAIService for testing

const renderShadcnChatInterface = () => {
  return render(
    <VrpAssistantProvider>
      <ShadcnChatInterface />
    </VrpAssistantProvider>
  )
}

describe('OpenAI Service Integration', () => {
  beforeEach(() => {
    localStorageMock.clear()
    Element.prototype.scrollIntoView = jest.fn()
    jest.clearAllMocks()
    
    // Set up environment variable for tests
    process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_OPENAI_API_KEY
  })

  it('creates OpenAI service instance successfully', () => {
    const service = new OpenAIService('test-key')
    expect(service).toBeInstanceOf(OpenAIService)
  })

  it('handles missing API key gracefully', () => {
    delete process.env.NEXT_PUBLIC_OPENAI_API_KEY
    expect(() => new OpenAIService()).toThrow('OpenAI API key is required')
  })

  it('validates service configuration', () => {
    const service = new OpenAIService('test-key')
    expect(service.isConfigured()).toBe(true)
    
    // Temporarily remove env var to test empty key
    delete process.env.NEXT_PUBLIC_OPENAI_API_KEY
    expect(() => new OpenAIService('')).toThrow()
    // Restore env var
    process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'test-api-key'
  })

  it('provides masked API key for display', () => {
    const service = new OpenAIService('sk-test1234567890abcdef')
    const masked = service.getMaskedApiKey()
    expect(masked).toBe('sk-test...cdef')
    expect(masked).not.toContain('1234567890abcd')
  })

  it('handles API call timeout gracefully', async () => {
    const service = new OpenAIService('test-key')
    
    // Mock a timeout error
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Request timeout'))
    
    await expect(service.sendMessage('test message'))
      .rejects.toThrow('Request timeout')
  })

  it('respects rate limiting with exponential backoff', async () => {
    const service = new OpenAIService('test-key')
    
    // Mock rate limit then success
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Success after rate limit' } }]
        })
      })

    const startTime = Date.now()
    const result = await service.sendMessage('test message')
    const endTime = Date.now()
    
    expect(result).toBe('Success after rate limit')
    expect(endTime - startTime).toBeGreaterThanOrEqual(1000) // At least 1 second delay
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('handles various HTTP error codes appropriately', async () => {
    const service = new OpenAIService('test-key')
    
    // Test 400 (no retry)
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request'
    })
    
    await expect(service.sendMessage('test'))
      .rejects.toThrow('OpenAI API error: 400 Bad Request')
    expect(fetch).toHaveBeenCalledTimes(1)
    
    jest.clearAllMocks()
    
    // Test 500 (with retry)
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Success after server error' } }]
        })
      })
    
    const result = await service.sendMessage('test')
    expect(result).toBe('Success after server error')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('handles malformed JSON responses', async () => {
    const service = new OpenAIService('test-key')
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ malformed: 'response' })
    })
    
    await expect(service.sendMessage('test'))
      .rejects.toThrow('Invalid response format from OpenAI API')
  })

  it('includes system prompt when provided', async () => {
    const service = new OpenAIService('test-key')
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Response with system prompt' } }]
      })
    })
    
    await service.sendMessage('user message', 'system prompt')
    
    const callArgs = (fetch as jest.Mock).mock.calls[0][1]
    const body = JSON.parse(callArgs.body)
    
    expect(body.messages).toEqual([
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: 'user message' }
    ])
  })

  it('uses correct OpenAI API parameters', async () => {
    const service = new OpenAIService('test-key')
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Test response' } }]
      })
    })
    
    await service.sendMessage('test message')
    
    const [url, options] = (fetch as jest.Mock).mock.calls[0]
    const body = JSON.parse(options.body)
    
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(options.headers['Authorization']).toBe('Bearer test-key')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(body.model).toBe('gpt-4')
    expect(body.max_tokens).toBe(1000)
    expect(body.temperature).toBe(0.7)
  })
})