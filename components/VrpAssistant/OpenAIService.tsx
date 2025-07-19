export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export class OpenAIService {
  private apiKey: string
  private baseUrl = 'https://api.openai.com/v1'
  private maxRetries = 2
  private retryDelay = 1000 // 1 second

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''
    
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('OpenAI API key is required. Set NEXT_PUBLIC_OPENAI_API_KEY environment variable or provide apiKey parameter.')
    }
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<string> {
    const messages: OpenAIMessage[] = []
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      })
    }
    
    messages.push({
      role: 'user',
      content: message
    })

    return this.makeAPICall(messages)
  }

  private async makeAPICall(messages: OpenAIMessage[], retryCount = 0): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages,
          max_tokens: 1000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        // Check if we should retry
        if (this.shouldRetry(response.status) && retryCount < this.maxRetries) {
          await this.delay(this.retryDelay * (retryCount + 1))
          return this.makeAPICall(messages, retryCount + 1)
        }
        
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data: OpenAIResponse = await response.json()
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI API')
      }

      return data.choices[0].message.content
    } catch (error) {
      // Retry on network errors
      if (this.isNetworkError(error) && retryCount < this.maxRetries) {
        await this.delay(this.retryDelay * (retryCount + 1))
        return this.makeAPICall(messages, retryCount + 1)
      }
      
      throw error
    }
  }

  private shouldRetry(status: number): boolean {
    // Retry on rate limits (429) and server errors (5xx)
    return status === 429 || (status >= 500 && status < 600)
  }

  private isNetworkError(error: any): boolean {
    return error instanceof TypeError || 
           (error.message && error.message.includes('network')) ||
           (error.message && error.message.includes('fetch'))
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim() !== '')
  }

  /**
   * Get a masked version of the API key for display purposes
   */
  getMaskedApiKey(): string {
    if (!this.apiKey) return 'Not configured'
    return `${this.apiKey.substring(0, 7)}...${this.apiKey.substring(this.apiKey.length - 4)}`
  }
}